import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { isFeriado } from "@/lib/feriados";

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
  });

  const { servicos, loading: loadingServicos } = useServicos();
  const { profissionais, loading: loadingProfissionais } = useProfissionais();
  const { agendamentos, loading: loadingAgendamentos, addAgendamento } = useAgendamentos();
  const { configs, getConfig } = useAgendaConfig();

  const fmtKey = (d: Date) => format(d, "yyyy-MM-dd");

  const generateSlots = (d?: Date) => {
    if (!d) return [];
    
    const dayOfWeek = d.getDay();
    const slots: string[] = [];
    
    // Segunda (1): Fechado
    // Terça (2) e Quarta (3): 13:00 às 20:00
    // Quinta (4) e Sexta (5): 09:00 às 19:00
    // Sábado (6): 08:00 às 13:00
    // Domingo (0): Fechado
    
    let startHour = 8;
    let endHour = 13;
    
    if (dayOfWeek === 2 || dayOfWeek === 3) { // Terça e Quarta
      startHour = 13;
      endHour = 20;
    } else if (dayOfWeek === 4 || dayOfWeek === 5) { // Quinta e Sexta
      startHour = 9;
      endHour = 19;
    } else if (dayOfWeek === 6) { // Sábado
      startHour = 8;
      endHour = 13;
    } else {
      return []; // Segunda e Domingo fechados
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
    
    // Fechado se: domingo (0) ou segunda (1) OU se configuração manual diz fechado
    const fechadoPorDia = dayOfWeek === 0 || dayOfWeek === 1;
    
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
    for (let min = inicioEmMinutos; min < fimEmMinutos; min += 30) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      const horario = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      horariosBloqueados.push(horario);
    }
    
    return horariosBloqueados;
  };

  const getAvailableSlots = useMemo(() => {
    return (d: Date | undefined) => {
      if (!d) return [];
      const dayData = getDayData(d);
      
      const dateStr = fmtKey(d);
      const agendamentosDay = agendamentos.filter(a => a.data === dateStr && a.status !== 'Cancelado');
      
      // Calcula todos os horários bloqueados considerando a duração de cada serviço
      const todosBloqueados = new Set<string>();
      
      agendamentosDay.forEach(ag => {
        const servico = servicos.find(s => s.id === ag.servico_id);
        if (servico) {
          const horariosBloqueados = calcularHorariosBloqueados(ag.horario, servico.duracao);
          horariosBloqueados.forEach(h => todosBloqueados.add(h));
        } else {
          // Se não encontrar o serviço, bloqueia apenas o horário inicial
          todosBloqueados.add(ag.horario);
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
  }, [agendamentos, servicos, configs]);

  const getServiceStartSlots = useMemo(() => {
    return (d: Date | undefined, servicoId?: string) => {
      if (!d || !servicoId) return [];
      const base = getAvailableSlots(d);
      const baseSet = new Set(base);
      const serv = servicos.find((s) => s.id === servicoId);
      if (!serv) return base;

      const steps = Math.ceil(serv.duracao / 30); // número de slots de 30min necessários
      
      // Determina horário de fechamento baseado no dia da semana
      const dayOfWeek = d.getDay();
      let limiteMinutos = 13 * 60; // Padrão sábado
      
      if (dayOfWeek === 2 || dayOfWeek === 3) { // Terça e Quarta
        limiteMinutos = 20 * 60;
      } else if (dayOfWeek === 4 || dayOfWeek === 5) { // Quinta e Sexta
        limiteMinutos = 19 * 60;
      } else if (dayOfWeek === 6) { // Sábado
        limiteMinutos = 13 * 60;
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
    
    if (!date || !formData.nome || !formData.telefone || !formData.servico || !formData.horario || !formData.dataNascimento) {
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

      // Criar ou atualizar cliente
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', formData.telefone)
        .maybeSingle();

      let clienteId = clienteExistente?.id;

      if (clienteExistente) {
        await supabase
          .from('clientes')
          .update({
            nome: formData.nome,
            data_nascimento: formData.dataNascimento,
          })
          .eq('id', clienteExistente.id);
      } else {
        const { data: novoCliente } = await supabase
          .from('clientes')
          .insert({
            nome: formData.nome,
            telefone: formData.telefone,
            data_nascimento: formData.dataNascimento,
          })
          .select()
          .single();
        clienteId = novoCliente?.id;
      }

      // VALIDAÇÃO CRÍTICA: Verificar conflitos de horário considerando duração dos serviços
      const { data: agendamentosDia, error: checkError } = await supabase
        .from('agendamentos')
        .select('*, servico_id')
        .eq('data', fmtKey(date))
        .neq('status', 'Cancelado');

      if (checkError) {
        console.error("Erro ao verificar disponibilidade:", checkError);
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
          const slotsExistentes = calcularHorariosBloqueados(ag.horario, servicoExistente.duracao);
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
    return getServiceStartSlots(date, formData.servico);
  }, [date, formData.servico, getServiceStartSlots]);
  
  const isLoading = loadingServicos || loadingProfissionais || loadingAgendamentos;

  return (
    <div className="min-h-screen gradient-soft py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
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
              <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
              <Input
                id="dataNascimento"
                type="date"
                value={formData.dataNascimento}
                onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                required
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
                      disponivel: (d: Date) => !getDayData(d).fechado && !isDayFull(d) && !isFeriado(d),
                      fechado: (d: Date) => getDayData(d).fechado && !isFeriado(d),
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
                    disabled={(d) => getDayData(d).fechado || isFeriado(d)}
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
              className="w-full"
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
  );
};

export default Agendar;
