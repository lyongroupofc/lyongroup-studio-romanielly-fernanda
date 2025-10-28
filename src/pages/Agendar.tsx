import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Sparkles, Calendar as CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { isBefore, startOfToday, isSunday } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  const servicos = [
    "Corte Feminino",
    "Corte Masculino",
    "Escova",
    "Hidratação",
    "Coloração",
    "Mechas",
    "Manicure",
    "Pedicure",
  ];

  const profissionais = ["Jennifer Silva", "Maria Santos", "Ana Costa"];

  type DayData = { reserved: string[]; blocked: string[]; extraOpen: string[]; closed: boolean };
  const [agendaByDate] = useState<Record<string, DayData>>(() => {
    const saved = localStorage.getItem("agendaByDate");
    return saved ? JSON.parse(saved) : {};
  });
  const fmtKey = (d: Date) => d.toISOString().split("T")[0];
  const generateSlots = () => {
    const slots: string[] = [];
    for (let h = 9; h <= 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  };
  const getDayData = (d: Date): DayData => {
    const existing = agendaByDate[fmtKey(d)];
    if (existing) return existing;
    return { reserved: [], blocked: [], extraOpen: [], closed: isSunday(d) };
  };
  const getAvailableSlots = (d: Date | undefined) => {
    if (!d) return [] as string[];
    const data = getDayData(d);
    if (data.closed) return [];
    const base = [...generateSlots(), ...data.extraOpen];
    const taken = new Set([...data.reserved, ...data.blocked]);
    return base.filter((t) => !taken.has(t)).sort();
  };
  const isDayFull = (d: Date) => {
    const data = getDayData(d);
    if (data.closed) return false;
    return getAvailableSlots(d).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !formData.nome || !formData.telefone || !formData.servico || !formData.horario) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    // Aqui será integrado com o backend e WhatsApp
    toast.success("Agendamento confirmado! Você receberá uma mensagem no WhatsApp.");
    
    setTimeout(() => {
      navigate("/obrigado", {
        state: {
          data: date.toLocaleDateString("pt-BR"),
          horario: formData.horario,
        },
      });
    }, 1500);
  };

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
                      <SelectItem key={servico} value={servico}>
                        {servico}
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
                      <SelectItem key={prof} value={prof}>
                        {prof}
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
                    disponivel: (d: Date) => !isBefore(d, startOfToday()) && !getDayData(d).closed && !isDayFull(d),
                    fechado: (d: Date) => !isBefore(d, startOfToday()) && getDayData(d).closed,
                    cheio: (d: Date) => !isBefore(d, startOfToday()) && !getDayData(d).closed && isDayFull(d),
                    past: (d: Date) => isBefore(d, startOfToday()),
                  }}
                  modifiersStyles={{
                    disponivel: { backgroundColor: "hsl(var(--success) / 0.2)", color: "hsl(var(--success))" },
                    fechado: { backgroundColor: "hsl(var(--destructive) / 0.2)", color: "hsl(var(--destructive))" },
                    cheio: { backgroundColor: "hsl(280 65% 60% / 0.2)", color: "hsl(280 65% 60%)" },
                    past: { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", opacity: 0.6 },
                  }}
                  disabled={(d) => isBefore(d, startOfToday()) || getDayData(d).closed}
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
                  {date && getAvailableSlots(date).length > 0 ? (
                    getAvailableSlots(date).map((horario) => (
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
                      Sem horários disponíveis
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
