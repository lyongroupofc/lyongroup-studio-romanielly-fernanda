import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Plus, Filter, X } from "lucide-react";
import { useState } from "react";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const Agenda = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [openNovoAgendamento, setOpenNovoAgendamento] = useState(false);
  const [openDayDialog, setOpenDayDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const handleSelect = (day: Date | undefined) => {
    setDate(day);
    setSelectedDate(day);
    if (day) setOpenDayDialog(true);
  };

  const handleNovoAgendamento = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("Agendamento criado com sucesso!");
    setOpenNovoAgendamento(false);
  };

  const handleReservarHorario = () => {
    toast.success("Horário reservado!");
    setOpenDayDialog(false);
  };

  const handleBloquearHorario = () => {
    toast.success("Horário bloqueado!");
    setOpenDayDialog(false);
  };

  const modifiers = {
    disponivel: (date: Date) => date.getDay() !== 0,
    fechado: (date: Date) => date.getDay() === 0,
  };

  const modifiersStyles = {
    disponivel: { backgroundColor: "hsl(var(--success) / 0.2)", color: "hsl(var(--success))" },
    fechado: { backgroundColor: "hsl(var(--destructive) / 0.2)", color: "hsl(var(--destructive))" },
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os agendamentos do salão
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => toast.info("Filtro em desenvolvimento")}>
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
          <Dialog open={openNovoAgendamento} onOpenChange={setOpenNovoAgendamento}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleNovoAgendamento} className="space-y-4">
                <div>
                  <Label htmlFor="cliente">Cliente</Label>
                  <Input id="cliente" placeholder="Nome do cliente" required />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" type="tel" placeholder="(00) 00000-0000" required />
                </div>
                <div>
                  <Label htmlFor="servico">Serviço</Label>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corte">Corte Feminino</SelectItem>
                      <SelectItem value="escova">Escova</SelectItem>
                      <SelectItem value="hidratacao">Hidratação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="profissional">Profissional</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jennifer">Jennifer Silva</SelectItem>
                      <SelectItem value="ana">Ana Paula</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="horario">Horário</Label>
                  <Input id="horario" type="time" required />
                </div>
                <Button type="submit" className="w-full">Confirmar Agendamento</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <CalendarIcon className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Calendário</h2>
        </div>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            locale={ptBR}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-xl border shadow-soft pointer-events-auto"
          />
        </div>
        <div className="flex items-center gap-6 mt-6 justify-center flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-success/20"></div>
            <span className="text-sm">Dias com vagas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive/20"></div>
            <span className="text-sm">Dias fechados</span>
          </div>
        </div>
      </Card>

      <Dialog open={openDayDialog} onOpenChange={setOpenDayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Gerenciar {selectedDate?.toLocaleDateString('pt-BR')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button onClick={handleReservarHorario} className="w-full">
              Reservar Horário
            </Button>
            <Button onClick={handleBloquearHorario} variant="destructive" className="w-full">
              Bloquear Horário
            </Button>
            <Button onClick={() => toast.info("Funcionalidade em desenvolvimento")} variant="outline" className="w-full">
              Gerenciar Dia
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Agendamentos de Hoje</h2>
        <div className="space-y-3">
          <div className="p-4 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Maria Silva</p>
                <p className="text-sm text-muted-foreground">
                  Corte + Escova • 14:00 - 15:30
                </p>
              </div>
              <span className="px-3 py-1 bg-success text-white text-sm rounded-full">
                Confirmado
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Agenda;
