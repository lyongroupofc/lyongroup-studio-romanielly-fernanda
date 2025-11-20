import { useState, useMemo, useEffect, useCallback } from "react";
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
import { useSearchParams } from "react-router-dom";
import { isFeriado } from "@/lib/feriados";
import { Skeleton } from "@/components/ui/skeleton";

const Agenda = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [openNovoDialog, setOpenNovoDialog] = useState(false);
  const [openReservarDialog, setOpenReservarDialog] = useState(false);
  const [openGerenciarDialog, setOpenGerenciarDialog] = useState(false);
  const [openDetalhesDialog, setOpenDetalhesDialog] = useState(false);
  const [openSideSheet, setOpenSideSheet] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [highlightedAgendamento, setHighlightedAgendamento] = useState<string | null>(null);

  const { agendamentos, loading: loadingAgendamentos, addAgendamento, updateAgendamento, deleteAgendamento, cancelAgendamento, refetch: refetchAgendamentos } = useAgendamentos();
  const { configs, getConfig, updateConfig, refetch: refetchConfig } = useAgendaConfig();
  const { servicos, loading: loadingServicos, refetch: refetchServicos } = useServicos();
  const { profissionais, loading: loadingProfissionais, refetch: refetchProfissionais } = useProfissionais();

  // Refetch quando a página ganha foco
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetchAgendamentos();
        refetchConfig();
        refetchServicos();
        refetchProfissionais();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetchAgendamentos, refetchConfig, refetchServicos, refetchProfissionais]);

  // Processar parâmetros de query para notificações
  useEffect(() => {
    const dateParam = searchParams.get('date');
    const highlightParam = searchParams.get('highlight');
    
    if (dateParam) {
      const [year, month, day] = dateParam.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      setSelectedDate(date);
      setOpenSideSheet(true);
    }
    
    if (highlightParam) {
      setHighlightedAgendamento(highlightParam);
      // Limpar o highlight após 3 segundos
      setTimeout(() => {
        setHighlightedAgendamento(null);
        setSearchParams({});
      }, 3000);
    }
  }, [searchParams, setSearchParams]);

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

  const generateSlots = (d?: Date) => {
    const slots: string[] = [];
    if (!d) return slots;
    
    const dayOfWeek = d.getDay();
    
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
    
    // Gera todos os slots de 30 em 30 minutos desde o início até o fim
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
      const agendamentosDay = agendamentos.filter((a) => a.data === dateStr);
      
      // Calcula todos os horários bloqueados considerando a duração de cada serviço
      const todosBloqueados = new Set<string>();
      
      agendamentosDay.forEach(ag => {
        const servico = servicos.find(s => s.id === ag.servico_id);
        if (servico) {
          const horariosBloqueados = calcularHorariosBloqueados(ag.horario, servico.duracao);
          horariosBloqueados.forEach(h => todosBloqueados.add(h));
        } else {
          todosBloqueados.add(ag.horario);
        }
      });
      
      dayData.horariosBloqueados.forEach(h => todosBloqueados.add(h));

      // Se o dia está fechado, retornar apenas horários extras (se houver)
      // Se o dia está aberto, retornar horários normais + horários extras
      const base = dayData.fechado 
        ? dayData.horariosExtras 
        : [...generateSlots(d), ...dayData.horariosExtras];
      
      return base.filter((t) => !todosBloqueados.has(t)).sort();
    };
  }, [agendamentos, servicos, configs]);

  const getServiceStartSlots = (d: Date | undefined, servicoId?: string) => {
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

  const isDayFull = (d: Date) => {
    const dayData = getDayData(d);
    if (dayData.fechado) return false;
    return getAvailableSlots(d).length === 0;
  };

  const modifiers = useMemo(() => ({
    disponivel: (d: Date) => !getDayData(d).fechado && !isDayFull(d) && !isFeriado(d),
    fechado: (d: Date) => getDayData(d).fechado && !isFeriado(d),
    cheio: (d: Date) => !getDayData(d).fechado && isDayFull(d) && !isFeriado(d),
    past: (d: Date) => isBefore(d, startOfToday()) && !isFeriado(d),
    feriado: (d: Date) => isFeriado(d),
  }), [configs, agendamentos]);

  const modifiersStyles = useMemo(() => ({
    disponivel: { backgroundColor: "hsl(var(--success) / 0.2)", color: "hsl(var(--success))", fontWeight: "600" },
    fechado: { backgroundColor: "hsl(var(--destructive) / 0.2)", color: "hsl(var(--destructive))", fontWeight: "600" },
    cheio: { backgroundColor: "hsl(280 65% 60% / 0.2)", color: "hsl(280 65% 60%)", fontWeight: "600" },
    past: { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", opacity: 0.6 },
    feriado: { backgroundColor: "hsl(var(--holiday) / 0.25)", color: "hsl(var(--holiday))", fontWeight: "700", border: "2px solid hsl(var(--holiday))" },
  }), []);

  const handleDayClick = useCallback((day: Date | undefined) => {
    if (!day) return;
    setSelectedDate(day);
    setOpenSideSheet(true);
  }, []);

  const handleReservar = useCallback(() => {
    setOpenSideSheet(false);
    setOpenReservarDialog(true);
  }, []);

  const handleGerenciar = useCallback(() => {
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
  }, [selectedDate, configs]);

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
      
      // NÃO chamar refetch() aqui - causa loop infinito
      // O updateConfig já atualiza o state e o cache automaticamente
      
      // Feedback detalhado
      const mensagens = [];
      if (gerenciarData.fechado) {
        mensagens.push("Dia marcado como fechado");
      }
      if (gerenciarData.horariosBloqueados.length > 0) {
        mensagens.push(`${gerenciarData.horariosBloqueados.length} horário(s) bloqueado(s)`);
      }
      if (gerenciarData.horariosExtras.length > 0) {
        mensagens.push(`${gerenciarData.horariosExtras.length} horário(s) extra(s) adicionado(s)`);
      }
      
      toast.success(
        mensagens.length > 0 
          ? `✅ Configuração salva: ${mensagens.join(", ")}` 
          : "✅ Configuração atualizada com sucesso!"
      );
      setOpenGerenciarDialog(false);
      setOpenSideSheet(true); // Reabre o side sheet para mostrar mudanças
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      toast.error("Erro ao salvar configuração");
    }
  };

  const agendamentosHoje = agendamentos.filter((a) => a.data === format(new Date(), "yyyy-MM-dd"));
  const agendamentosDia = selectedDate ? agendamentos.filter((a) => a.data === fmtKey(selectedDate)) : [];

  if (loadingAgendamentos || loadingServicos || loadingProfissionais) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Skeleton do Calendário */}
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-[350px] w-full" />
            <div className="mt-6 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </Card>

          {/* Skeleton dos Agendamentos de Hoje */}
          <Card className="p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Card>
        </div>
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
                <Card 
                  key={agendamento.id} 
                  className={`p-4 hover-lift cursor-pointer transition-all ${
                    highlightedAgendamento === agendamento.id 
                      ? 'ring-2 ring-primary ring-offset-2 bg-primary/5 animate-pulse' 
                      : ''
                  }`}
                  onClick={() => {
                    setSelectedAgendamento(agendamento);
                    setOpenDetalhesDialog(true);
                  }}
                >
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
                    <Card 
                      key={agendamento.id} 
                      className={`p-3 hover-lift cursor-pointer transition-all ${
                        highlightedAgendamento === agendamento.id 
                          ? 'ring-2 ring-primary ring-offset-2 bg-primary/5 animate-pulse' 
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedAgendamento(agendamento);
                        setOpenDetalhesDialog(true);
                        setOpenSideSheet(false);
                      }}
                    >
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
            <DialogTitle>
              Novo Agendamento {selectedDate ? `- ${format(selectedDate, "dd/MM/yyyy")}` : ""}
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
            {/* Data do agendamento */}
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serviço *</Label>
                <Select value={formData.servico} onValueChange={(value) => setFormData({ ...formData, servico: value, horario: '' })}>
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
              <Select
                value={formData.horario}
                onValueChange={(value) => setFormData({ ...formData, horario: value })}
                disabled={!formData.servico}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.servico ? "Selecione um horário" : "Selecione um serviço primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {getServiceStartSlots(selectedDate, formData.servico).map((h) => (
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
              <Select
                value={formData.horario}
                onValueChange={(value) => setFormData({ ...formData, horario: value })}
                disabled={!formData.servico}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.servico ? "Selecione um horário" : "Selecione um serviço primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {getServiceStartSlots(selectedDate, formData.servico).map((h) => (
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
                {!isBefore(new Date(selectedAgendamento.data), startOfToday()) && selectedAgendamento.status !== "Cancelado" && (
                  <Button variant="destructive" onClick={async () => {
                    await cancelAgendamento(selectedAgendamento.id);
                    setOpenDetalhesDialog(false);
                    setSelectedAgendamento(null);
                  }}>
                    Cancelar Agendamento
                  </Button>
                )}
                {(selectedAgendamento.status === "Cancelado" || isBefore(new Date(selectedAgendamento.data), startOfToday())) && (
                  <Button variant="destructive" onClick={async () => {
                    await deleteAgendamento(selectedAgendamento.id);
                    setOpenDetalhesDialog(false);
                    setSelectedAgendamento(null);
                  }}>
                    Excluir Agendamento
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
