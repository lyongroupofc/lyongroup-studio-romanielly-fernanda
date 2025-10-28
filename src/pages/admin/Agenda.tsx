import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Plus, Filter, X } from "lucide-react";
import { useState } from "react";
import { ptBR } from "date-fns/locale";
import { isBefore, startOfToday } from "date-fns";
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
  const [reservarDialogOpen, setReservarDialogOpen] = useState(false);
  const [gerenciarDialogOpen, setGerenciarDialogOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [newTime, setNewTime] = useState<string>("");

  type DayData = { reserved: string[]; blocked: string[]; extraOpen: string[]; closed: boolean };
  const [agendaByDate, setAgendaByDate] = useState<Record<string, DayData>>({});
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
  const getDayData = (d: Date): DayData => agendaByDate[fmtKey(d)] ?? { reserved: [], blocked: [], extraOpen: [], closed: false };
  const getAvailableSlots = (d: Date | undefined) => {
    if (!d) return [] as string[];
    const data = getDayData(d);
    if (data.closed) return [];
    const base = [...generateSlots(), ...data.extraOpen];
    const taken = new Set([...data.reserved, ...data.blocked]);
    return base.filter((t) => !taken.has(t)).sort();
  };

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
    disponivel: (date: Date) => date.getDay() !== 0 && !isBefore(date, startOfToday()),
    fechado: (date: Date) => date.getDay() === 0,
    past: (date: Date) => isBefore(date, startOfToday()),
  };

  const modifiersStyles = {
    disponivel: { backgroundColor: "hsl(var(--success) / 0.2)", color: "hsl(var(--success))" },
    fechado: { backgroundColor: "hsl(var(--destructive) / 0.2)", color: "hsl(var(--destructive))" },
    past: { backgroundColor: "transparent", color: "hsl(var(--foreground))", opacity: 0.9 },
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
            disabled={{ before: startOfToday() }}
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
              <Button onClick={() => setReservarDialogOpen(true)} className="w-full">
                Reservar Horário
              </Button>
              <Button onClick={() => setGerenciarDialogOpen(true)} variant="outline" className="w-full">
                Gerenciar Dia
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reservarDialogOpen} onOpenChange={setReservarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservar Horário {selectedDate ? `- ${selectedDate.toLocaleDateString('pt-BR')}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Horário disponível</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um horário" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableSlots(selectedDate).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReservarDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => {
                if (!selectedDate || !selectedTime) { toast.info("Selecione um horário"); return; }
                const key = fmtKey(selectedDate);
                const data = getDayData(selectedDate);
                if (data.closed) { toast.error("Dia fechado"); return; }
                setAgendaByDate({
                  ...agendaByDate,
                  [key]: { ...data, reserved: [...data.reserved, selectedTime] }
                });
                setReservarDialogOpen(false);
                setOpenDayDialog(false);
                setSelectedTime(undefined);
                toast.success("Horário reservado!");
              }}>Confirmar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={gerenciarDialogOpen} onOpenChange={setGerenciarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Dia {selectedDate ? `- ${selectedDate.toLocaleDateString('pt-BR')}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm">Status do dia</p>
              <div className="flex gap-2">
                <Button
                  variant={selectedDate && getDayData(selectedDate).closed ? "outline" : "destructive"}
                  onClick={() => {
                    if (!selectedDate) return;
                    const key = fmtKey(selectedDate);
                    const data = getDayData(selectedDate);
                    setAgendaByDate({ ...agendaByDate, [key]: { ...data, closed: !data.closed } });
                    toast.success(data.closed ? "Dia reaberto" : "Dia fechado");
                  }}
                >
                  {selectedDate && getDayData(selectedDate).closed ? "Reabrir Dia" : "Fechar Dia"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bloquear horário</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um horário" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSlots(selectedDate).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => {
                  if (!selectedDate || !selectedTime) { toast.info("Selecione um horário"); return; }
                  const key = fmtKey(selectedDate);
                  const data = getDayData(selectedDate);
                  setAgendaByDate({ ...agendaByDate, [key]: { ...data, blocked: [...data.blocked, selectedTime] } });
                  setSelectedTime(undefined);
                  toast.success("Horário bloqueado!");
                }}>Bloquear</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Abrir novo horário</Label>
              <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={() => {
                  if (!selectedDate || !newTime) { toast.info("Informe um horário"); return; }
                  const key = fmtKey(selectedDate);
                  const data = getDayData(selectedDate);
                  setAgendaByDate({ ...agendaByDate, [key]: { ...data, extraOpen: Array.from(new Set([...data.extraOpen, newTime])) } });
                  setNewTime("");
                  toast.success("Horário aberto!");
                }}>Adicionar</Button>
              </div>
            </div>
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
