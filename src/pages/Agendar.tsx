import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Sparkles, Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { isBefore, startOfToday, isSunday, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useServicos } from "@/hooks/useServicos";
import { useProfissionais } from "@/hooks/useProfissionais";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useAgendaConfig } from "@/hooks/useAgendaConfig";
import { usePromocoes } from "@/hooks/usePromocoes";
import { isFeriado } from "@/lib/feriados";
import Footer from "@/components/Footer";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const Agendar = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>();
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    dataNascimento: "",
    servico: "",
    profissional: "",
    horario: "",
    promocao: "",
  });

  const { servicos, loading: loadingServicos } = useServicos();
  const { profissionais, loading: loadingProfissionais } = useProfissionais();
  const { agendamentos, loading: loadingAgendamentos, addAgendamento } = useAgendamentos();
  const { configs, getConfig } = useAgendaConfig();
  const { promocoes } = usePromocoes();

  // Estado para agendamentos em tempo real da data selecionada
  const [agendamentosDataAtual, setAgendamentosDataAtual] = useState<typeof agendamentos>([]);
  const [loadingDisponibilidade, setLoadingDisponibilidade] = useState(false);

  // Buscar agendamentos em tempo real quando a data é selecionada
  useEffect(() => {
    if (!date) {
      setAgendamentosDataAtual([]);
      return;
    }

    const fetchDisponibilidadeRealTime = async () => {
      setLoadingDisponibilidade(true);
      try {
        const { data: agendamentosDia, error } = await supabase
          .from('agendamentos')
          .select('id, data, horario, cliente_nome, cliente_telefone, cliente_id, servico_id, servico_nome, profissional_id, profissional_nome, status, observacoes, origem')
          .eq('data', fmtKey(date))
          .neq('status', 'Cancelado');

        if (error) {
          console.error("Erro ao buscar disponibilidade:", error);
          setAgendamentosDataAtual([]);
        } else {
          setAgendamentosDataAtual(agendamentosDia || []);
        }
      } catch (error) {
        console.error("Erro ao buscar disponibilidade:", error);
        setAgendamentosDataAtual([]);
      } finally {
        setLoadingDisponibilidade(false);
      }
    };

    fetchDisponibilidadeRealTime();
  }, [date]);

  const fmtKey = (d: Date) => format(d, "yyyy-MM-dd");

  const generateSlots = (d?: Date) => {
    if (!d) return [];
    
    const dayOfWeek = d.getDay();
    const slots: string[] = [];
    
    // Domingo (0): FECHADO
    // Segunda (1): FECHADO
    // Terça (2): FECHADO
    // Quarta (3): 13:00 às 19:00
    // Quinta (4) e Sexta (5): 09:00 às 19:00
    // Sábado (6): FECHADO
    
    let startHour = 13;
    let endHour = 19;
    
    if (dayOfWeek === 3) { // Quarta
      startHour = 13;
      endHour = 19;
    } else if (dayOfWeek === 4 || dayOfWeek === 5) { // Quinta e Sexta
      startHour = 9;
      endHour = 19;
    } else {
      return []; // Domingo, Segunda, Terça e Sábado fechados
    }
    
    for (let h = startHour; h <= endHour; h++) {
      for (let m = 0; m < 60; m += 30) {
        // Não gerar horário de fechamento + 30min
        if (h === endHour && m === 30) continue;
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  };

  const getDayData = (d: Date) => {
    const config = getConfig(fmtKey(d));
    const dayOfWeek = d.getDay();
    
    // Fechado se: domingo (0), segunda (1), terça (2) ou sábado (6) OU se configuração manual diz fechado
    const fechadoPorDia = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 6;
    
    return {
      fechado: config?.fechado || fechadoPorDia,
      horariosBloqueados: config?.horarios_bloqueados || [],
      horariosExtras: config?.horarios_extras || [],
    };
  };

  const calcularHorariosBloqueados = (horarioInicio: string, duracaoMinutos: number): string[] => {
    const [horas, minutos] = horarioInicio.split(':').map(Number);
    const inicioEmMinutos = horas * 60 + minutos;
    const fimEmMinutos = inicioEmMinutos + duracaoMinutos;
    
    const horariosBloqueados: string[] = [];
    
    // Gera todos os slots de 30 em 30 minutos desde o início até o fim (duração do serviço)
    for (let min = inicioEmMinutos; min <= fimEmMinutos; min += 30) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      const horario = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      horariosBloqueados.push(horario);
    }
    
    return horariosBloqueados;
  };

  const getAvailableSlots = useMemo(() => {
    return (d: Date | undefined, useRealTimeData: boolean = false) => {
      if (!d) return [];
      const dayData = getDayData(d);
      
      const dateStr = fmtKey(d);
      // Usar dados em tempo real quando disponível para a data selecionada
      const agendamentosDay = useRealTimeData 
        ? agendamentosDataAtual 
        : agendamentos.filter(a => a.data === dateStr && a.status !== 'Cancelado');
      
      // Calcula todos os horários bloqueados considerando a duração de cada serviço
      const todosBloqueados = new Set<string>();
      
      agendamentosDay.forEach(ag => {
        // Normalizar horário removendo segundos (ex: "15:00:00" -> "15:00")
        const horarioNormalizado = ag.horario.length > 5 ? ag.horario.substring(0, 5) : ag.horario;
        
        // Tentar encontrar serviço pelo ID primeiro
        let servico = servicos.find(s => s.id === ag.servico_id);
        
        // Fallback: buscar pelo nome se não encontrou pelo ID (agendamentos legados/manuais)
        if (!servico && ag.servico_nome) {
          const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const nomeAlvo = normalize(ag.servico_nome.split(',')[0]); // Pegar primeiro serviço se houver múltiplos
          servico = servicos.find(s => normalize(s.nome).includes(nomeAlvo) || nomeAlvo.includes(normalize(s.nome)));
        }
        
        if (servico) {
          const horariosBloqueados = calcularHorariosBloqueados(horarioNormalizado, servico.duracao);
          horariosBloqueados.forEach(h => todosBloqueados.add(h));
        } else {
          // Se não encontrou serviço, usar duração padrão de 60min
          const duracaoPadrao = 60;
          const horariosBloqueados = calcularHorariosBloqueados(horarioNormalizado, duracaoPadrao);
          horariosBloqueados.forEach(h => todosBloqueados.add(h));
        }
      });
      
      // Adiciona horários bloqueados manualmente
      dayData.horariosBloqueados.forEach(h => todosBloqueados.add(h));
      
      // Se o dia está fechado, retornar apenas horários extras (se houver)
      // Se o dia está aberto, retornar horários normais + horários extras
      const base = dayData.fechado 
        ? dayData.horariosExtras 
        : [...generateSlots(d), ...dayData.horariosExtras];
      
      return base.filter((t) => !todosBloqueados.has(t)).sort();
    };
  }, [agendamentos, agendamentosDataAtual, servicos, configs]);

  const getServiceStartSlots = useMemo(() => {
    return (d: Date | undefined, servicoId?: string, useRealTimeData: boolean = false) => {
      if (!d || !servicoId) return [];
      const base = getAvailableSlots(d, useRealTimeData);
      const baseSet = new Set(base);
      const serv = servicos.find((s) => s.id === servicoId);
      if (!serv) return base;

      const steps = Math.ceil(serv.duracao / 30); // número de slots de 30min necessários
      
      // Determina horário de fechamento baseado no dia da semana OU horários extras
      const dayData = getDayData(d);
      const dayOfWeek = d.getDay();
      let limiteMinutos = 13 * 60; // Padrão sábado
      
      // Se o dia tem horários extras, calcular limite baseado no maior horário extra
      if (dayData.horariosExtras.length > 0) {
        const ultimoHorarioExtra = dayData.horariosExtras[dayData.horariosExtras.length - 1];
        const [h, m] = ultimoHorarioExtra.split(':').map(Number);
        limiteMinutos = h * 60 + m + 30; // +30 para permitir agendamentos até o último slot
      } else {
        // Se não tem horários extras, usar horários padrão do dia da semana
        if (dayOfWeek === 3) { // Quarta
          limiteMinutos = 19 * 60;
        } else if (dayOfWeek === 4 || dayOfWeek === 5) { // Quinta e Sexta
          limiteMinutos = 19 * 60;
        }
      }

      const toMin = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

      return base.filter((start) => {
        const inicio = toMin(start);
        const fim = inicio + serv.duracao;
        if (fim > limiteMinutos) return false; // precisa terminar antes do horário de fechamento
        for (let k = 0; k < steps; k++) {
          const slot = toHHMM(inicio + k * 30);
          if (!baseSet.has(slot)) return false;
        }
        return true;
      });
    };
  }, [getAvailableSlots, servicos]);

  const isDayFull = useMemo(() => {
    return (d: Date) => {
      return getAvailableSlots(d).length === 0;
    };
  }, [getAvailableSlots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !formData.nome || !formData.telefone || !formData.servico || !formData.horario) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      const servico = servicos.find(s => s.id === formData.servico);
      if (!servico) {
        toast.error("Serviço não encontrado");
        return;
      }
      
      const profissional = formData.profissional ? profissionais.find(p => p.id === formData.profissional) : null;

      // Calcular desconto se houver promoção selecionada
      let descontoAplicado = 0;
      if (formData.promocao) {
        const promocao = promocoes.find(p => p.id === formData.promocao);
        if (promocao) {
          if (promocao.desconto_porcentagem) {
            descontoAplicado = (servico.preco * promocao.desconto_porcentagem) / 100;
          } else if (promocao.desconto_valor) {
            descontoAplicado = promocao.desconto_valor;
          }
        }
      }

      // Criar ou atualizar cliente
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', formData.telefone)
        .maybeSingle();

      let clienteId = clienteExistente?.id;

      if (clienteExistente) {
        const updateData: any = { nome: formData.nome };
        // Só atualiza data de nascimento se foi preenchida
        if (formData.dataNascimento) {
          updateData.data_nascimento = formData.dataNascimento;
        }
        await supabase
          .from('clientes')
          .update(updateData)
          .eq('id', clienteExistente.id);
      } else {
        const insertData: any = {
          nome: formData.nome,
          telefone: formData.telefone,
        };
        if (formData.dataNascimento) {
          insertData.data_nascimento = formData.dataNascimento;
        }
        const { data: novoCliente } = await supabase
          .from('clientes')
          .insert(insertData)
          .select()
          .single();
        clienteId = novoCliente?.id;
      }

      // VALIDAÇÃO CRÍTICA: Verificar conflitos de horário considerando duração dos serviços
      const { data: agendamentosDia, error } = await supabase
        .from('agendamentos')
        .select('*, servico_id, origem')
        .eq('data', fmtKey(date))
        .neq('status', 'Cancelado');

      if (error) {
        console.error("Erro ao verificar disponibilidade:", error);
        toast.error("Erro ao verificar disponibilidade do horário");
        return;
      }

      // Calcular slots que o novo agendamento vai ocupar
      const slotsNovoAgendamento = calcularHorariosBloqueados(formData.horario, servico.duracao);

      // Verificar se algum slot conflita com agendamentos existentes
      let temConflito = false;
      for (const ag of agendamentosDia || []) {
        const servicoExistente = servicos.find(s => s.id === ag.servico_id);
        if (servicoExistente) {
          // NORMALIZAR: Remover segundos do horário do banco (HH:MM:SS -> HH:MM)
          const horarioNormalizado = ag.horario.length > 5 ? ag.horario.substring(0, 5) : ag.horario;
          const slotsExistentes = calcularHorariosBloqueados(horarioNormalizado, servicoExistente.duracao);
          // Verificar se há interseção entre os slots
          const haIntersecao = slotsNovoAgendamento.some(slot => slotsExistentes.includes(slot));
          if (haIntersecao) {
            temConflito = true;
            break;
          }
        }
      }

      if (temConflito) {
        toast.error("Este horário conflita com outro agendamento! Por favor, escolha outro horário disponível.");
        return;
      }

      await addAgendamento({
        data: fmtKey(date),
        horario: formData.horario,
        cliente_nome: formData.nome,
        cliente_telefone: formData.telefone,
        cliente_id: clienteId,
        servico_id: formData.servico,
        servico_nome: servico?.nome || "",
        profissional_id: formData.profissional || null,
        profissional_nome: profissional?.nome || null,
        status: "Confirmado",
        observacoes: null,
        origem: "link_externo",
        promocao_id: formData.promocao || null,
        desconto_aplicado: descontoAplicado,
      });

      toast.success("Agendamento confirmado! Você receberá uma confirmação no WhatsApp.");
      
      setTimeout(() => {
        navigate("/obrigado", {
          state: {
            data: date.toLocaleDateString("pt-BR"),
            horario: formData.horario,
          },
        });
      }, 1500);
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const horariosDisponiveis = useMemo(() => {
    // Usar dados em tempo real para calcular horários disponíveis
    return getServiceStartSlots(date, formData.servico, true);
  }, [date, formData.servico, getServiceStartSlots, agendamentosDataAtual]);
  
  const isLoading = loadingServicos || loadingProfissionais || loadingAgendamentos || loadingDisponibilidade;

  return (
    <div className="min-h-screen gradient-soft flex flex-col relative">
      <AnimatedBackground />
      {/* Header com Ícone */}
      <header className="w-full py-6">
        <div className="container mx-auto px-4 flex justify-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-primary shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </div>
      </header>
      
      <div className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Studio Romanielly Fernanda</h1>
            <p className="text-lg text-muted-foreground">
              Escolha o melhor dia e horário para você ✨
            </p>
          </div>

        <Card className="p-6 md:p-8 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  placeholder="Seu nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">WhatsApp *</Label>
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataNascimento">Data de Nascimento (opcional)</Label>
              <Input
                id="dataNascimento"
                type="date"
                value={formData.dataNascimento}
                onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="servico">Serviço Desejado *</Label>
                {loadingServicos ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={formData.servico}
                    onValueChange={(value) => setFormData({ ...formData, servico: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map((servico) => (
                        <SelectItem key={servico.id} value={servico.id}>
                          {servico.nome} - R$ {servico.preco.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profissional">Profissional (Opcional)</Label>
                {loadingProfissionais ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={formData.profissional}
                    onValueChange={(value) => setFormData({ ...formData, profissional: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem preferência" />
                    </SelectTrigger>
                    <SelectContent>
                      {profissionais.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promocao">Promoção (Opcional)</Label>
              <Select
                value={formData.promocao || undefined}
                onValueChange={(value) => setFormData({ ...formData, promocao: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem promoção" />
                </SelectTrigger>
                <SelectContent>
                  {promocoes
                    .filter(p => p.ativa && new Date(p.data_inicio) <= new Date() && new Date(p.data_fim) >= new Date())
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} - {p.desconto_porcentagem ? `${p.desconto_porcentagem}%` : `R$ ${p.desconto_valor}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Escolha a Data *
              </Label>
              <div className="flex justify-center">
                {loadingAgendamentos ? (
                  <Skeleton className="h-[300px] w-[300px] rounded-md" />
                ) : (
                  <Calendar
                    key="booking-calendar"
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={ptBR}
                    modifiers={{
                      disponivel: (d: Date) => {
                        const dayData = getDayData(d);
                        const temHorariosDisponiveis = !dayData.fechado || dayData.horariosExtras.length > 0;
                        return temHorariosDisponiveis && !isDayFull(d) && !isFeriado(d);
                      },
                      fechado: (d: Date) => {
                        const dayData = getDayData(d);
                        return dayData.fechado && dayData.horariosExtras.length === 0 && !isFeriado(d);
                      },
                      cheio: (d: Date) => !getDayData(d).fechado && isDayFull(d) && !isFeriado(d),
                      past: (d: Date) => isBefore(d, startOfToday()) && !isFeriado(d),
                      feriado: (d: Date) => isFeriado(d),
                    }}
                    modifiersStyles={{
                      disponivel: { backgroundColor: "hsl(var(--success) / 0.2)", color: "hsl(var(--success))" },
                      fechado: { backgroundColor: "hsl(var(--destructive) / 0.2)", color: "hsl(var(--destructive))" },
                      cheio: { backgroundColor: "hsl(280 65% 60% / 0.2)", color: "hsl(280 65% 60%)" },
                      past: { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", opacity: 0.6 },
                      feriado: { backgroundColor: "hsl(var(--holiday) / 0.25)", color: "hsl(var(--holiday))", fontWeight: "700", border: "2px solid hsl(var(--holiday))" },
                    }}
                    disabled={(d) => {
                      const dayData = getDayData(d);
                      const diaEstaFechado = dayData.fechado && dayData.horariosExtras.length === 0;
                      return diaEstaFechado || isFeriado(d);
                    }}
                    className="rounded-md border shadow-sm pointer-events-auto"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horário Disponível *
              </Label>
              {loadingAgendamentos ? (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {horariosDisponiveis.length > 0 ? (
                    horariosDisponiveis.map((horario) => (
                      <Button
                        key={horario}
                        type="button"
                        variant={formData.horario === horario ? "default" : "outline"}
                        onClick={() => setFormData({ ...formData, horario })}
                        className="w-full"
                      >
                        {horario}
                      </Button>
                    ))
                  ) : (
                    <div className="col-span-3 md:col-span-4 text-center text-muted-foreground py-2">
                      Sem horários disponíveis para esta data
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              size="lg" 
              className="w-full shadow-lg hover:shadow-xl hover:shadow-primary/50 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                "Confirmar Agendamento"
              )}
            </Button>
          </form>
        </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Agendar;
