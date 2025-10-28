import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Plus, Filter, Loader2 } from "lucide-react";
import { useState } from "react";
import { ptBR } from "date-fns/locale";
import { isBefore, startOfToday, isSunday, format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { useAgendaConfig } from "@/hooks/useAgendaConfig";
import { useServicos } from "@/hooks/useServicos";
import { useProfissionais } from "@/hooks/useProfissionais";

const Agenda = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [openNovoAgendamento, setOpenNovoAgendamento] = useState(false);
  const [openDayDialog, setOpenDayDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [reservarDialogOpen, setReservarDialogOpen] = useState(false);
  const [gerenciarDialogOpen, setGerenciarDialogOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [newTime, setNewTime] = useState<string>("");
  const [detalhesDialogOpen, setDetalhesDialogOpen] = useState(false);

  const { agendamentos, loading: loadingAgendamentos, addAgendamento } = useAgendamentos();
  const { configs, loading: loadingConfigs, getConfig, updateConfig } = useAgendaConfig();
  const { servicos } = useServicos();
  const { profissionais } = useProfissionais();

  const fmtKey = (d: Date) => format(d, "yyyy-MM-dd");
  
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

  const getDayData = (d: Date) => {
    const config = getConfig(fmtKey(d));
    return {
      fechado: config?.fechado || isSunday(d),
      horariosBloqueados: config?.horarios_bloqueados || [],
      horariosExtras: config?.horarios_extras || [],
    };
  };

  const getAvailableSlots = (d: Date | undefined) => {
    if (!d) return [];
    const dayData = getDayData(d);
    if (dayData.fechado) return [];
    
    const dateStr = fmtKey(d);
    const agendamentosDay = agendamentos.filter(a => a.data === dateStr);
    const horariosReservados = new Set(agendamentosDay.map(a => a.horario));
    const horariosBloqueados = new Set(dayData.horariosBloqueados);
    
    const base = [...generateSlots(), ...dayData.horariosExtras];
    return base.filter((t) => !horariosReservados.has(t) && !horariosBloqueados.has(t)).sort();
  };

  const isDayFull = (d: Date): boolean => {
    const dayData = getDayData(d);
    if (dayData.fechado) return false;
    return getAvailableSlots(d).length === 0;
  };

  const handleSelect = (day: Date | undefined) => {
    setDate(day);
    setSelectedDate(day);
    if (day) {
      const isPast = isBefore(day, startOfToday());
      if (isPast) {
        setDetalhesDialogOpen(true);
      } else {
        setOpenDayDialog(true);
      }
    }
  };

  const modifiers = {
    disponivel: (date: Date) => !isBefore(date, startOfToday()) && !getDayData(date).fechado && !isDayFull(date),
    fechado: (date: Date) => getDayData(date).fechado && !isBefore(date, startOfToday()),
    cheio: (date: Date) => !isBefore(date, startOfToday()) && !getDayData(date).fechado && isDayFull(date),
    past: (date: Date) => isBefore(date, startOfToday()),
  };

  const modifiersStyles = {
    disponivel: { backgroundColor: "hsl(var(--success) / 0.2)", color: "hsl(var(--success))" },
    fechado: { backgroundColor: "hsl(var(--destructive) / 0.2)", color: "hsl(var(--destructive))" },
    cheio: { backgroundColor: "hsl(280 65% 60% / 0.2)", color: "hsl(280 65% 60%)" },
    past: { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", opacity: 0.6 },
  };

  if (loadingAgendamentos || loadingConfigs) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const agendamentosHoje = agendamentos.filter(a => a.data === fmtKey(new Date()));

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
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await addAgendamento({
                  data: fmtKey(new Date()),
                  horario: formData.get("horario") as string,
                  cliente_nome: formData.get("cliente") as string,
                  cliente_telefone: formData.get("telefone") as string,
                  servico_id: formData.get("servico") as string,
                  servico_nome: servicos.find(s => s.id === formData.get("servico"))?.nome || "",
                  profissional_id: formData.get("profissional") as string || null,
                  profissional_nome: profissionais.find(p => p.id === formData.get("profissional"))?.nome || null,
                  status: "Confirmado",
                  observacoes: null,
                });
                setOpenNovoAgendamento(false);
              }} className="space-y-4">
                <div>
                  <Label htmlFor="cliente">Cliente</Label>
                  <Input id="cliente" name="cliente" placeholder="Nome do cliente" required />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" name="telefone" type="tel" placeholder="(00) 00000-0000" required />
                </div>
                <div>
                  <Label htmlFor="servico">Serviço</Label>
                  <Select name="servico" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="profissional">Profissional</Label>
                  <Select name="profissional">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {profissionais.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="horario">Horário</Label>
                  <Input id="horario" name="horario" type="time" required />
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
        <div className="flex justify-center py-6">
          <div className="scale-125">
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
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(280 65% 60% / 0.2)" }}></div>
            <span className="text-sm">Dias cheios</span>
          </div>
        </div>
      </Card>

      {/* Dialog: Selecionar ação do dia */}
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

      {/* Dialog: Reservar horário (formulário completo) */}
      <Dialog open={reservarDialogOpen} onOpenChange={setReservarDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Agendamento {selectedDate ? `- ${selectedDate.toLocaleDateString('pt-BR')}` : ''}</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const servicoId = formData.get("servico") as string;
            const profissionalId = formData.get("profissional") as string;
            
            if (!selectedDate) return;
            
            await addAgendamento({
              data: fmtKey(selectedDate),
              horario: formData.get("horario") as string,
              cliente_nome: formData.get("cliente") as string,
              cliente_telefone: formData.get("telefone") as string,
              servico_id: servicoId,
              servico_nome: servicos.find(s => s.id === servicoId)?.nome || "",
              profissional_id: profissionalId || null,
              profissional_nome: profissionais.find(p => p.id === profissionalId)?.nome || null,
              status: "Confirmado",
              observacoes: null,
            });
            
            setReservarDialogOpen(false);
            setOpenDayDialog(false);
          }} className="space-y-4">
            <div>
              <Label htmlFor="cliente">Cliente *</Label>
              <Input id="cliente" name="cliente" placeholder="Nome do cliente" required />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone *</Label>
              <Input id="telefone" name="telefone" type="tel" placeholder="(00) 00000-0000" required />
            </div>
            <div>
              <Label htmlFor="servico">Serviço *</Label>
              <Select name="servico" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicos.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome} - R$ {s.preco.toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="profissional">Profissional (Opcional)</Label>
              <Select name="profissional">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="horario">Horário *</Label>
              <Select name="horario" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um horário" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSlots(selectedDate).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setReservarDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Confirmar Agendamento</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Gerenciar dia */}
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
                  variant={selectedDate && getDayData(selectedDate).fechado ? "outline" : "destructive"}
                  onClick={async () => {
                    if (!selectedDate) return;
                    const current = getDayData(selectedDate);
                    await updateConfig(fmtKey(selectedDate), { fechado: !current.fechado });
                    toast.success(current.fechado ? "Dia reaberto" : "Dia fechado");
                    setGerenciarDialogOpen(false);
                    setOpenDayDialog(false);
                  }}
                >
                  {selectedDate && getDayData(selectedDate).fechado ? "Reabrir Dia" : "Fechar Dia"}
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
                <Button variant="secondary" onClick={async () => {
                  if (!selectedDate || !selectedTime) {
                    toast.info("Selecione um horário");
                    return;
                  }
                  const current = getDayData(selectedDate);
                  await updateConfig(fmtKey(selectedDate), {
                    horarios_bloqueados: [...current.horariosBloqueados, selectedTime]
                  });
                  setSelectedTime(undefined);
                  toast.success("Horário bloqueado!");
                }}>Bloquear</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Abrir novo horário</Label>
              <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={async () => {
                  if (!selectedDate || !newTime) {
                    toast.info("Informe um horário");
                    return;
                  }
                  const current = getDayData(selectedDate);
                  await updateConfig(fmtKey(selectedDate), {
                    horarios_extras: Array.from(new Set([...current.horariosExtras, newTime]))
                  });
                  setNewTime("");
                  toast.success("Horário aberto!");
                }}>Adicionar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do dia passado */}
      <Dialog open={detalhesDialogOpen} onOpenChange={setDetalhesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Dia {selectedDate ? `- ${selectedDate.toLocaleDateString('pt-BR')}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDate && agendamentos.filter(a => a.data === fmtKey(selectedDate)).length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold">Agendamentos Realizados</h3>
                {agendamentos.filter(a => a.data === fmtKey(selectedDate)).map((agend) => (
                  <div key={agend.id} className="p-4 bg-success/10 rounded-lg border border-success/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{agend.cliente_nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {agend.servico_nome} • {agend.horario}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-success text-white text-sm rounded-full">
                        {agend.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Nenhum agendamento registrado neste dia</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Agendamentos de hoje */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Agendamentos de Hoje</h2>
        <div className="space-y-3">
          {agendamentosHoje.length > 0 ? (
            agendamentosHoje.map((agend) => (
              <div key={agend.id} className="p-4 bg-success/10 rounded-lg border border-success/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{agend.cliente_nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {agend.servico_nome} • {agend.horario}
                      {agend.profissional_nome && ` • ${agend.profissional_nome}`}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-success text-white text-sm rounded-full">
                    {agend.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">Nenhum agendamento para hoje</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Agenda;
