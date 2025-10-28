import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Loader2, Clock, User, Phone, Scissors } from "lucide-react";
import { toast } from "sonner";
import { isBefore, startOfToday, isSunday, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAgendamentos, type Agendamento } from "@/hooks/useAgendamentos";
import { useAgendaConfig } from "@/hooks/useAgendaConfig";
import { useServicos } from "@/hooks/useServicos";
import { useProfissionais } from "@/hooks/useProfissionais";

const Agenda = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [openNovoDialog, setOpenNovoDialog] = useState(false);
  const [openReservarDialog, setOpenReservarDialog] = useState(false);
  const [openGerenciarDialog, setOpenGerenciarDialog] = useState(false);
  const [openDetalhesDialog, setOpenDetalhesDialog] = useState(false);
  const [openSideSheet, setOpenSideSheet] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);

  const { agendamentos, loading: loadingAgendamentos, addAgendamento, updateAgendamento, deleteAgendamento, refetch } = useAgendamentos();
  const { getConfig, updateConfig } = useAgendaConfig();
  const { servicos, loading: loadingServicos } = useServicos();
  const { profissionais, loading: loadingProfissionais } = useProfissionais();

  // Refetch ao montar componente para pegar novos agendamentos
  useEffect(() => {
    refetch();
  }, []);

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    servico: "",
    profissional: "",
    horario: "",
    observacoes: "",
  });

  const [gerenciarData, setGerenciarData] = useState({
    fechado: false,
    horariosBloqueados: [] as string[],
    horariosExtras: [] as string[],
    novoHorarioBloqueado: "",
    novoHorarioExtra: "",
  });

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

  const calcularHorariosBloqueados = (horarioInicio: string, duracaoMinutos: number): string[] => {
    const [horas, minutos] = horarioInicio.split(':').map(Number);
    const inicioEmMinutos = horas * 60 + minutos;
    const fimEmMinutos = inicioEmMinutos + duracaoMinutos;
    
    const horariosBloqueados: string[] = [];
    
    // Gera todos os slots de 30 em 30 minutos desde o início até o fim
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
    const agendamentosDay = agendamentos.filter((a) => a.data === dateStr);
    
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

  const modifiers = {
    disponivel: (d: Date) => !isBefore(d, startOfToday()) && !getDayData(d).fechado && !isDayFull(d),
    fechado: (d: Date) => !isBefore(d, startOfToday()) && getDayData(d).fechado,
    cheio: (d: Date) => !isBefore(d, startOfToday()) && !getDayData(d).fechado && isDayFull(d),
    past: (d: Date) => isBefore(d, startOfToday()),
  };

  const modifiersStyles = {
    disponivel: { backgroundColor: "hsl(var(--success) / 0.2)", color: "hsl(var(--success))", fontWeight: "600" },
    fechado: { backgroundColor: "hsl(var(--destructive) / 0.2)", color: "hsl(var(--destructive))", fontWeight: "600" },
    cheio: { backgroundColor: "hsl(280 65% 60% / 0.2)", color: "hsl(280 65% 60%)", fontWeight: "600" },
    past: { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", opacity: 0.6 },
  };

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return;
    setSelectedDate(day);

    if (isBefore(day, startOfToday())) {
      const agendamentosPassados = agendamentos.filter((a) => a.data === fmtKey(day));
      if (agendamentosPassados.length > 0) {
        setOpenDetalhesDialog(true);
      }
      return;
    }

    setOpenSideSheet(true);
  };

  const handleReservar = () => {
    setOpenSideSheet(false);
    setOpenReservarDialog(true);
  };

  const handleGerenciar = () => {
    if (!selectedDate) return;
    const dayData = getDayData(selectedDate);
    setGerenciarData({
      fechado: dayData.fechado,
      horariosBloqueados: dayData.horariosBloqueados,
      horariosExtras: dayData.horariosExtras,
      novoHorarioBloqueado: "",
      novoHorarioExtra: "",
    });
    setOpenSideSheet(false);
    setOpenGerenciarDialog(true);
  };

  const handleSubmitReservar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !formData.nome || !formData.telefone || !formData.servico || !formData.horario) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const servico = servicos.find((s) => s.id === formData.servico);
      const profissional = formData.profissional ? profissionais.find((p) => p.id === formData.profissional) : null;

      await addAgendamento({
        data: fmtKey(selectedDate),
        horario: formData.horario,
        cliente_nome: formData.nome,
        cliente_telefone: formData.telefone,
        servico_id: formData.servico,
        servico_nome: servico?.nome || "",
        profissional_id: formData.profissional || null,
        profissional_nome: profissional?.nome || null,
        status: "Confirmado",
        observacoes: formData.observacoes || null,
      });

      setOpenReservarDialog(false);
      setFormData({ nome: "", telefone: "", servico: "", profissional: "", horario: "", observacoes: "" });
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleSalvarGerenciar = async () => {
    if (!selectedDate) return;

    try {
      await updateConfig(fmtKey(selectedDate), {
        fechado: gerenciarData.fechado,
        horarios_bloqueados: gerenciarData.horariosBloqueados,
        horarios_extras: gerenciarData.horariosExtras,
      });
      toast.success("Configuração atualizada!");
      setOpenGerenciarDialog(false);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const agendamentosHoje = agendamentos.filter((a) => a.data === format(new Date(), "yyyy-MM-dd"));
  const agendamentosDia = selectedDate ? agendamentos.filter((a) => a.data === fmtKey(selectedDate)) : [];

  if (loadingAgendamentos || loadingServicos || loadingProfissionais) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground mt-1">Gerencie os agendamentos do salão</p>
        </div>
        <Button onClick={() => setOpenNovoDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendário */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Calendário</h2>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDayClick}
              locale={ptBR}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md border shadow-sm scale-125"
            />
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--success) / 0.2)" }}></div>
              <span>Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(280 65% 60% / 0.2)" }}></div>
              <span>Cheio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--destructive) / 0.2)" }}></div>
              <span>Fechado</span>
            </div>
          </div>
        </Card>

        {/* Agendamentos de Hoje */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Agendamentos de Hoje</h2>
          {agendamentosHoje.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum agendamento para hoje</p>
          ) : (
            <div className="space-y-3">
              {agendamentosHoje.map((agendamento) => (
                <Card key={agendamento.id} className="p-4 hover-lift cursor-pointer" onClick={() => {
                  setSelectedAgendamento(agendamento);
                  setOpenDetalhesDialog(true);
                }}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-semibold">{agendamento.horario}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-3 h-3" />
                        <span>{agendamento.cliente_nome}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Scissors className="w-3 h-3" />
                        <span>{agendamento.servico_nome}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      agendamento.status === "Confirmado" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}>
                      {agendamento.status}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Sheet lateral para ações do dia */}
      <Sheet open={openSideSheet} onOpenChange={setOpenSideSheet}>
        <SheetContent side="left" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>
              {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Button className="w-full" onClick={handleReservar}>
              <Plus className="w-4 h-4 mr-2" />
              Reservar Horário
            </Button>
            <Button variant="outline" className="w-full" onClick={handleGerenciar}>
              Gerenciar Dia
            </Button>

            {/* Agendamentos do dia selecionado */}
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Agendamentos deste dia</h3>
              {agendamentosDia.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum agendamento</p>
              ) : (
                <div className="space-y-2">
                  {agendamentosDia.map((agendamento) => (
                    <Card key={agendamento.id} className="p-3 hover-lift cursor-pointer" onClick={() => {
                      setSelectedAgendamento(agendamento);
                      setOpenDetalhesDialog(true);
                      setOpenSideSheet(false);
                    }}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-primary" />
                          <span className="font-semibold text-sm">{agendamento.horario}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <User className="w-3 h-3" />
                          <span>{agendamento.cliente_nome}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Scissors className="w-3 h-3" />
                          <span>{agendamento.servico_nome}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog Novo Agendamento */}
      <Dialog open={openNovoDialog} onOpenChange={setOpenNovoDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitReservar} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Cliente *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serviço *</Label>
                <Select value={formData.servico} onValueChange={(value) => setFormData({ ...formData, servico: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicos.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={formData.profissional} onValueChange={(value) => setFormData({ ...formData, profissional: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem preferência" />
                  </SelectTrigger>
                  <SelectContent>
                    {profissionais.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Horário *</Label>
              <Select value={formData.horario} onValueChange={(value) => setFormData({ ...formData, horario: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um horário" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSlots(selectedDate).map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenNovoDialog(false)}>Cancelar</Button>
              <Button type="submit">Confirmar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Reservar Horário */}
      <Dialog open={openReservarDialog} onOpenChange={setOpenReservarDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Reservar Horário - {selectedDate && format(selectedDate, "dd/MM/yyyy")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitReservar} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Cliente *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serviço *</Label>
                <Select value={formData.servico} onValueChange={(value) => setFormData({ ...formData, servico: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicos.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={formData.profissional} onValueChange={(value) => setFormData({ ...formData, profissional: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem preferência" />
                  </SelectTrigger>
                  <SelectContent>
                    {profissionais.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Horário *</Label>
              <Select value={formData.horario} onValueChange={(value) => setFormData({ ...formData, horario: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um horário" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSlots(selectedDate).map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenReservarDialog(false)}>Cancelar</Button>
              <Button type="submit">Confirmar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Gerenciar Dia */}
      <Dialog open={openGerenciarDialog} onOpenChange={setOpenGerenciarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Dia - {selectedDate && format(selectedDate, "dd/MM/yyyy")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Fechar este dia</Label>
              <Button
                variant={gerenciarData.fechado ? "destructive" : "outline"}
                onClick={() => setGerenciarData({ ...gerenciarData, fechado: !gerenciarData.fechado })}
              >
                {gerenciarData.fechado ? "Reabrir" : "Fechar"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Bloquear Horários</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 14:00"
                  value={gerenciarData.novoHorarioBloqueado}
                  onChange={(e) => setGerenciarData({ ...gerenciarData, novoHorarioBloqueado: e.target.value })}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (gerenciarData.novoHorarioBloqueado) {
                      setGerenciarData({
                        ...gerenciarData,
                        horariosBloqueados: [...gerenciarData.horariosBloqueados, gerenciarData.novoHorarioBloqueado],
                        novoHorarioBloqueado: "",
                      });
                    }
                  }}
                >
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {gerenciarData.horariosBloqueados.map((h) => (
                  <span key={h} className="px-2 py-1 bg-destructive/10 text-destructive rounded text-sm flex items-center gap-1">
                    {h}
                    <button
                      type="button"
                      onClick={() => setGerenciarData({
                        ...gerenciarData,
                        horariosBloqueados: gerenciarData.horariosBloqueados.filter((x) => x !== h),
                      })}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adicionar Horários Extras</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 19:00"
                  value={gerenciarData.novoHorarioExtra}
                  onChange={(e) => setGerenciarData({ ...gerenciarData, novoHorarioExtra: e.target.value })}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (gerenciarData.novoHorarioExtra) {
                      setGerenciarData({
                        ...gerenciarData,
                        horariosExtras: [...gerenciarData.horariosExtras, gerenciarData.novoHorarioExtra],
                        novoHorarioExtra: "",
                      });
                    }
                  }}
                >
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {gerenciarData.horariosExtras.map((h) => (
                  <span key={h} className="px-2 py-1 bg-success/10 text-success rounded text-sm flex items-center gap-1">
                    {h}
                    <button
                      type="button"
                      onClick={() => setGerenciarData({
                        ...gerenciarData,
                        horariosExtras: gerenciarData.horariosExtras.filter((x) => x !== h),
                      })}
                      className="ml-1 hover:text-success"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenGerenciarDialog(false)}>Cancelar</Button>
              <Button onClick={handleSalvarGerenciar}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes do Agendamento */}
      <Dialog open={openDetalhesDialog} onOpenChange={setOpenDetalhesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedAgendamento && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{selectedAgendamento.horario} - {selectedAgendamento.data}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{selectedAgendamento.cliente_nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{selectedAgendamento.cliente_telefone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4" />
                  <span>{selectedAgendamento.servico_nome}</span>
                </div>
                {selectedAgendamento.profissional_nome && (
                  <div className="text-sm text-muted-foreground">
                    Profissional: {selectedAgendamento.profissional_nome}
                  </div>
                )}
                {selectedAgendamento.observacoes && (
                  <div className="text-sm text-muted-foreground">
                    Obs: {selectedAgendamento.observacoes}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenDetalhesDialog(false)}>Fechar</Button>
                {!isBefore(new Date(selectedAgendamento.data), startOfToday()) && (
                  <Button variant="destructive" onClick={async () => {
                    await deleteAgendamento(selectedAgendamento.id);
                    setOpenDetalhesDialog(false);
                    setSelectedAgendamento(null);
                  }}>
                    Cancelar Agendamento
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agenda;
