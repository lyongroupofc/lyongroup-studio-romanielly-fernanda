import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Sparkles, Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isBefore, startOfToday, isSunday, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useServicos } from "@/hooks/useServicos";
import { useProfissionais } from "@/hooks/useProfissionais";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useAgendaConfig } from "@/hooks/useAgendaConfig";

const Agendar = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    servico: "",
    profissional: "",
    horario: "",
  });

  const { servicos, loading: loadingServicos } = useServicos();
  const { profissionais, loading: loadingProfissionais } = useProfissionais();
  const { agendamentos, addAgendamento } = useAgendamentos();
  const { configs, getConfig } = useAgendaConfig();

  const fmtKey = (d: Date) => format(d, "yyyy-MM-dd");

  const generateSlots = () => {
    const slots: string[] = [];
    // Funcionamento: 08:00 às 21:00 em intervalos de 30min
    for (let h = 8; h <= 21; h++) {
      for (let m = 0; m < 60; m += 30) {
        // Não gerar 21:30 (fechamos às 21:00)
        if (h === 21 && m === 30) continue;
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  };

  const getDayData = (d: Date) => {
    const config = getConfig(fmtKey(d));
    return {
      fechado: config?.fechado || isSunday(d),
      horariosBloqueados: config?.horarios_bloqueados || [],
      horariosExtras: config?.horarios_extras || [],
    };
  };

  const calcularHorariosBloqueados = (horarioInicio: string, duracaoMinutos: number): string[] => {
    const [horas, minutos] = horarioInicio.split(':').map(Number);
    const inicioEmMinutos = horas * 60 + minutos;
    // Adicionar buffer de 60 minutos
    const fimEmMinutos = inicioEmMinutos + duracaoMinutos + 60;
    
    const horariosBloqueados: string[] = [];
    
    // Gera todos os slots de 30 em 30 minutos desde o início até o fim (com buffer)
    for (let min = inicioEmMinutos; min < fimEmMinutos; min += 30) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      const horario = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      horariosBloqueados.push(horario);
    }
    
    return horariosBloqueados;
  };

  const getAvailableSlots = (d: Date | undefined) => {
    if (!d) return [];
    const dayData = getDayData(d);
    if (dayData.fechado) return [];
    
    const dateStr = fmtKey(d);
    const agendamentosDay = agendamentos.filter(a => a.data === dateStr);
    
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
    
    const base = [...generateSlots(), ...dayData.horariosExtras];
    return base.filter((t) => !todosBloqueados.has(t)).sort();
  };

  const isDayFull = (d: Date) => {
    const dayData = getDayData(d);
    if (dayData.fechado) return false;
    return getAvailableSlots(d).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !formData.nome || !formData.telefone || !formData.servico || !formData.horario) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      const servico = servicos.find(s => s.id === formData.servico);
      const profissional = formData.profissional ? profissionais.find(p => p.id === formData.profissional) : null;

      await addAgendamento({
        data: fmtKey(date),
        horario: formData.horario,
        cliente_nome: formData.nome,
        cliente_telefone: formData.telefone,
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

  if (loadingServicos || loadingProfissionais) {
    return (
      <div className="min-h-screen gradient-soft flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const horariosDisponiveis = getAvailableSlots(date);

  return (
    <div className="min-h-screen gradient-soft py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Agende seu Horário</h1>
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

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="servico">Serviço Desejado *</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="profissional">Profissional (Opcional)</Label>
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
              </div>
            </div>

            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Escolha a Data *
              </Label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ptBR}
                  modifiers={{
                    disponivel: (d: Date) => !isBefore(d, startOfToday()) && !getDayData(d).fechado && !isDayFull(d),
                    fechado: (d: Date) => !isBefore(d, startOfToday()) && getDayData(d).fechado,
                    cheio: (d: Date) => !isBefore(d, startOfToday()) && !getDayData(d).fechado && isDayFull(d),
                    past: (d: Date) => isBefore(d, startOfToday()),
                  }}
                  modifiersStyles={{
                    disponivel: { backgroundColor: "hsl(var(--success) / 0.2)", color: "hsl(var(--success))" },
                    fechado: { backgroundColor: "hsl(var(--destructive) / 0.2)", color: "hsl(var(--destructive))" },
                    cheio: { backgroundColor: "hsl(280 65% 60% / 0.2)", color: "hsl(280 65% 60%)" },
                    past: { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", opacity: 0.6 },
                  }}
                  disabled={(d) => isBefore(d, startOfToday()) || getDayData(d).fechado}
                  className="rounded-md border shadow-sm pointer-events-auto"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horário Disponível *
              </Label>
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
            </div>

            <Button type="submit" size="lg" className="w-full">
              Confirmar Agendamento
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Agendar;
