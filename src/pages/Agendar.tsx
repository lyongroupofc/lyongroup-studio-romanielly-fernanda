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

  const horarios = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
  ];

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
                  className="rounded-md border shadow-sm"
                  disabled={(date) => date < new Date() || date.getDay() === 0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horário Disponível *
              </Label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {horarios.map((horario) => (
                  <Button
                    key={horario}
                    type="button"
                    variant={formData.horario === horario ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, horario })}
                    className="w-full"
                  >
                    {horario}
                  </Button>
                ))}
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
