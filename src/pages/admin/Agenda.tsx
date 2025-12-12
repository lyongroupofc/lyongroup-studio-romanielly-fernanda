import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, Clock, User, Phone, Scissors, Search, X, Bot, Link2, UserPlus, UserCheck, CheckCircle2, ChevronLeft, ChevronRight, DollarSign, Timer, PlusCircle, RefreshCw, CalendarDays, Lock } from "lucide-react";
import { addDays, eachDayOfInterval, getDay, parseISO } from "date-fns";
import { DayGridDialog } from "@/components/DayGridDialog";
import { toast } from "sonner";
import { isBefore, startOfToday, isSunday, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAgendamentos, type Agendamento } from "@/hooks/useAgendamentos";
import { useAgendaConfig } from "@/hooks/useAgendaConfig";
import { useServicos } from "@/hooks/useServicos";
import { useProfissionais } from "@/hooks/useProfissionais";
import { useClientes } from "@/hooks/useClientes";
import { usePromocoes } from "@/hooks/usePromocoes";
import { usePagamentos } from "@/hooks/usePagamentos";
import { useSearchParams } from "react-router-dom";
import { isFeriado } from "@/lib/feriados";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Component - Agenda Admin
const Agenda = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [openNovoDialog, setOpenNovoDialog] = useState(false);
  const [openReservarDialog, setOpenReservarDialog] = useState(false);
  const [openEscolhaClienteDialog, setOpenEscolhaClienteDialog] = useState(false);
  const [tipoCliente, setTipoCliente] = useState<'novo' | 'cadastrado' | null>(null);
  const [buscaClienteTexto, setBuscaClienteTexto] = useState("");
  const [openGerenciarDialog, setOpenGerenciarDialog] = useState(false);
  const [openDetalhesDialog, setOpenDetalhesDialog] = useState(false);
  const [openEditarDialog, setOpenEditarDialog] = useState(false);
  const [openSuccessDialog, setOpenSuccessDialog] = useState(false);
  const [openSideSheet, setOpenSideSheet] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [highlightedAgendamento, setHighlightedAgendamento] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { agendamentos, loading: loadingAgendamentos, addAgendamento, updateAgendamento, deleteAgendamento, cancelAgendamento, refetch: refetchAgendamentos } = useAgendamentos();
  const { configs, getConfig, updateConfig, refetch: refetchConfig } = useAgendaConfig();
  const { servicos, loading: loadingServicos, refetch: refetchServicos } = useServicos();
  const { profissionais, loading: loadingProfissionais, refetch: refetchProfissionais } = useProfissionais();
  const { clientes } = useClientes();
  const { promocoes } = usePromocoes();
  const { addPagamento } = usePagamentos();

  // Estados para funcionalidades extras
  const [openPagamentoDialog, setOpenPagamentoDialog] = useState(false);
  const [openEstenderDialog, setOpenEstenderDialog] = useState(false);
  const [openAdicionarServicoDialog, setOpenAdicionarServicoDialog] = useState(false);
  const [pagamentoData, setPagamentoData] = useState({ valor: "", metodo: "PIX" });
  const [extensaoMinutos, setExtensaoMinutos] = useState(30);
  const [servicoAdicionalId, setServicoAdicionalId] = useState<string>("");

  // Estados para bloqueio em lote
  const [openBloqueioLoteDialog, setOpenBloqueioLoteDialog] = useState(false);
  const [bloqueioLoteData, setBloqueioLoteData] = useState({
    dataInicio: "",
    dataFim: "",
    horariosSelecionados: [] as string[],
    descricao: "",
    diasSemana: [1, 2, 3, 4, 5, 6] as number[], // seg=1 ... sáb=6
  });
  const [salvandoBloqueioLote, setSalvandoBloqueioLote] = useState(false);

  // Estado para agendamentos em tempo real da data selecionada
  const [agendamentosDataAtual, setAgendamentosDataAtual] = useState<Agendamento[]>([]);
  const [loadingDisponibilidade, setLoadingDisponibilidade] = useState(false);

  // Buscar agendamentos em tempo real quando abrir QUALQUER dialog de agendamento
  useEffect(() => {
    if ((!openReservarDialog && !openNovoDialog) || !selectedDate) {
      return;
    }

    const fetchDisponibilidadeRealTime = async () => {
      setLoadingDisponibilidade(true);
      try {
        const dateStr = fmtKey(selectedDate);
        console.log(`[fetchDisponibilidade] Buscando agendamentos para ${dateStr}`);
        
        const { data: agendamentosDia, error } = await supabase
          .from('agendamentos')
          .select('id, data, horario, cliente_nome, cliente_telefone, cliente_id, servico_id, servico_nome, profissional_id, profissional_nome, status, observacoes, origem, status_pagamento, confirmado_cliente, atendido')
          .eq('data', dateStr)
          .neq('status', 'Cancelado')
          .neq('status', 'Excluido')
          .order('horario', { ascending: true });

        if (error) {
          console.error("[fetchDisponibilidade] Erro:", error);
          setAgendamentosDataAtual([]);
        } else {
          console.log(`[fetchDisponibilidade] Encontrados ${agendamentosDia?.length || 0} agendamentos:`, agendamentosDia);
          setAgendamentosDataAtual(agendamentosDia || []);
        }
      } catch (error) {
        console.error("[fetchDisponibilidade] Erro catch:", error);
        setAgendamentosDataAtual([]);
      } finally {
        setLoadingDisponibilidade(false);
      }
    };

    fetchDisponibilidadeRealTime();
  }, [openReservarDialog, openNovoDialog, selectedDate]);

  // Desabilitado refetch automático para evitar loops
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (!document.hidden) {
  //       refetchAgendamentos();
  //       refetchConfig();
  //       refetchServicos();
  //       refetchProfissionais();
  //     }
  //   };
  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  // }, []);

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
    dataNascimento: "",
    servicosSelecionados: [] as string[],
    profissional: undefined as string | undefined,
    horario: undefined as string | undefined,
    observacoes: "",
    promocao: "none",
  });

  const [clienteCadastradoSelecionado, setClienteCadastradoSelecionado] = useState<string>("");
  const [clientesBusca, setClientesBusca] = useState<typeof clientes>([]);

  // Buscar clientes em tempo real conforme digita
  const handleBuscarCliente = (termo: string) => {
    if (!termo.trim()) {
      setClientesBusca([]);
      setClienteCadastradoSelecionado("");
      return;
    }
    
    const termoLower = termo.toLowerCase();
    const clientesFiltrados = clientes.filter(c => 
      c.nome.toLowerCase().includes(termoLower) ||
      c.telefone.includes(termo)
    ).slice(0, 10); // Limitar a 10 resultados
    
    setClientesBusca(clientesFiltrados);
  };

  const handleSelecionarClienteCadastrado = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setFormData({
        ...formData,
        nome: cliente.nome,
        telefone: cliente.telefone,
        dataNascimento: cliente.data_nascimento || "",
      });
      setClienteCadastradoSelecionado(clienteId);
      setOpenEscolhaClienteDialog(false);
      setOpenReservarDialog(true);
    }
  };

  const handleEscolhaNovoCliente = () => {
    setFormData({
      nome: "",
      telefone: "",
      dataNascimento: "",
      servicosSelecionados: [],
      profissional: undefined,
      horario: undefined,
      observacoes: "",
      promocao: "none",
    });
    setClienteCadastradoSelecionado("");
    setOpenEscolhaClienteDialog(false);
    setOpenNovoDialog(true);
  };

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
    
    // Gera todos os slots de 30 em 30 minutos desde o início até ANTES do fim
    // Exemplo: serviço de 75min às 17:30 bloqueia 17:30, 18:00, 18:30 (próximo disponível 19:00)
    for (let min = inicioEmMinutos; min < fimEmMinutos; min += 30) {
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
      
      // Usar dados em tempo real quando solicitado E a data corresponde à selectedDate
      let agendamentosDay: Agendamento[];
      if (useRealTimeData) {
        // Verificar se a data solicitada é a mesma que selectedDate (dados carregados)
        const selectedDateStr = selectedDate ? fmtKey(selectedDate) : null;
        if (selectedDateStr === dateStr) {
          agendamentosDay = agendamentosDataAtual;
          console.log(`[getAvailableSlots] Usando dados em tempo real para ${dateStr}:`, agendamentosDay);
        } else {
          // Fallback: usar dados do cache se a data não corresponde
          console.warn(`[getAvailableSlots] Data solicitada (${dateStr}) difere de selectedDate (${selectedDateStr}), usando cache`);
          agendamentosDay = agendamentos.filter((a) => a.data === dateStr && a.status !== 'Cancelado');
        }
      } else {
        agendamentosDay = agendamentos.filter((a) => a.data === dateStr && a.status !== 'Cancelado');
      }
      
      // Calcula todos os horários bloqueados considerando a duração de cada serviço
      const todosBloqueados = new Set<string>();
      
      console.log(`[getAvailableSlots] Processando ${agendamentosDay.length} agendamentos para ${dateStr}`);
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
          console.log(`[getAvailableSlots] Bloqueando ${horariosBloqueados.join(', ')} (${ag.cliente_nome} - ${servico.nome}, ${servico.duracao}min)`);
          horariosBloqueados.forEach(h => todosBloqueados.add(h));
        } else {
          // Se não encontrou serviço, usar duração padrão de 60min
          const duracaoPadrao = 60;
          const horariosBloqueados = calcularHorariosBloqueados(horarioNormalizado, duracaoPadrao);
          console.log(`[getAvailableSlots] AVISO: Serviço não encontrado para agendamento ${ag.id} (${ag.cliente_nome} - ${ag.servico_nome}), usando duração padrão 60min, bloqueando ${horariosBloqueados.join(', ')}`);
          horariosBloqueados.forEach(h => todosBloqueados.add(h));
        }
      });
      
      dayData.horariosBloqueados.forEach(h => todosBloqueados.add(h));

      // Se o dia está fechado, retornar apenas horários extras (se houver)
      // Se o dia está aberto, retornar horários normais + horários extras
      const base = dayData.fechado 
        ? dayData.horariosExtras 
        : [...generateSlots(d), ...dayData.horariosExtras];
      
      const disponiveis = base.filter((t) => !todosBloqueados.has(t)).sort();
      console.log(`[getAvailableSlots] Horários disponíveis para ${dateStr}:`, disponiveis);
      console.log(`[getAvailableSlots] Total bloqueados:`, Array.from(todosBloqueados).sort());
      
      return disponiveis;
    };
  }, [agendamentos, agendamentosDataAtual, servicos, configs, openReservarDialog, openNovoDialog, selectedDate]);

  const getServiceStartSlots = (d: Date | undefined, servicoId?: string, useRealTimeData: boolean = false) => {
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
      if (dayOfWeek === 2 || dayOfWeek === 3) { // Terça e Quarta
        limiteMinutos = 20 * 60;
      } else if (dayOfWeek === 4 || dayOfWeek === 5) { // Quinta e Sexta
        limiteMinutos = 19 * 60;
      } else if (dayOfWeek === 6) { // Sábado
        limiteMinutos = 13 * 60;
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

  // Função para calcular slots disponíveis para múltiplos serviços
  const getMultiServiceStartSlots = (d: Date | undefined, servicoIds: string[], useRealTimeData: boolean = false) => {
    if (!d || servicoIds.length === 0) return [];
    const base = getAvailableSlots(d, useRealTimeData);
    const baseSet = new Set(base);
    
    // Calcular duração total de todos os serviços
    const duracaoTotal = servicoIds.reduce((acc, id) => {
      const serv = servicos.find(s => s.id === id);
      return acc + (serv?.duracao || 0);
    }, 0);
    
    if (duracaoTotal === 0) return base;

    const steps = Math.ceil(duracaoTotal / 30);
    
    const dayData = getDayData(d);
    const dayOfWeek = d.getDay();
    let limiteMinutos = 13 * 60;
    
    if (dayData.horariosExtras.length > 0) {
      const ultimoHorarioExtra = dayData.horariosExtras[dayData.horariosExtras.length - 1];
      const [h, m] = ultimoHorarioExtra.split(':').map(Number);
      limiteMinutos = h * 60 + m + 30;
    } else {
      if (dayOfWeek === 2 || dayOfWeek === 3) limiteMinutos = 20 * 60;
      else if (dayOfWeek === 4 || dayOfWeek === 5) limiteMinutos = 19 * 60;
      else if (dayOfWeek === 6) limiteMinutos = 13 * 60;
    }

    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    return base.filter((start) => {
      const inicio = toMin(start);
      const fim = inicio + duracaoTotal;
      if (fim > limiteMinutos) return false;
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
    disponivel: (d: Date) => {
      const dayData = getDayData(d);
      // Dia disponível se: (não fechado OU tem horários extras) E não está cheio E não é feriado
      const temHorariosDisponiveis = !dayData.fechado || dayData.horariosExtras.length > 0;
      return temHorariosDisponiveis && !isDayFull(d) && !isFeriado(d);
    },
    fechado: (d: Date) => {
      const dayData = getDayData(d);
      // Dia fechado APENAS se está marcado como fechado E NÃO tem horários extras
      return dayData.fechado && dayData.horariosExtras.length === 0 && !isFeriado(d);
    },
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

  const handleDayClick = useCallback(async (day: Date | undefined) => {
    if (!day) return;
    setSelectedDate(day);
    
    // Buscar agendamentos em tempo real para este dia
    const dateStr = fmtKey(day);
    const { data: agendamentosRealTime, error } = await supabase
      .from('agendamentos')
      .select('id, data, horario, cliente_nome, cliente_telefone, cliente_id, servico_id, servico_nome, profissional_id, profissional_nome, status, observacoes, origem, status_pagamento, confirmado_cliente, atendido')
      .eq('data', dateStr)
      .neq('status', 'Cancelado')
      .order('horario', { ascending: true });

    if (!error && agendamentosRealTime) {
      setAgendamentosDataAtual(agendamentosRealTime);
      console.log(`[handleDayClick] Agendamentos carregados em tempo real para ${dateStr}:`, agendamentosRealTime);
    } else {
      console.error('[handleDayClick] Erro ao carregar agendamentos:', error);
    }
    
    setOpenSideSheet(true);
  }, []);

  const handleReservar = useCallback(() => {
    setOpenSideSheet(false);
    setOpenEscolhaClienteDialog(true); // Abre popup de escolha entre novo/cadastrado
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

  const handleToggleFechado = () => {
    if (!selectedDate) return;
    
    const novoStatusFechado = !gerenciarData.fechado;
    
    // Se está REABRINDO o dia (fechado -> aberto), adicionar automaticamente horários de 08:00 às 19:00
    if (!novoStatusFechado) {
      // Gerar horários de 08:00 às 19:00 em intervalos de 30 minutos
      const horariosParaAdicionar: string[] = [];
      for (let h = 8; h <= 19; h++) {
        for (let m = 0; m < 60; m += 30) {
          if (h === 19 && m === 30) continue; // Não adicionar 19:30
          const hh = String(h).padStart(2, "0");
          const mm = String(m).padStart(2, "0");
          horariosParaAdicionar.push(`${hh}:${mm}`);
        }
      }
      
      // Adicionar horários ao campo horariosExtras (evitando duplicados)
      const horariosAtuais = new Set(gerenciarData.horariosExtras);
      horariosParaAdicionar.forEach(h => horariosAtuais.add(h));
      
      setGerenciarData({
        ...gerenciarData,
        fechado: novoStatusFechado,
        horariosExtras: Array.from(horariosAtuais).sort(),
      });
      
      toast.success("✅ Dia reaberto com horários de 08:00 às 19:00");
    } else {
      // Se está FECHANDO o dia, apenas atualiza o status
      setGerenciarData({
        ...gerenciarData,
        fechado: novoStatusFechado,
      });
    }
  };

  const handleSubmitReservar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !formData.nome || !formData.telefone || formData.servicosSelecionados.length === 0 || !formData.horario) {
      toast.error("Preencha todos os campos obrigatórios (incluindo pelo menos 1 serviço)");
      return;
    }

    try {
      // Buscar todos os serviços selecionados
      const servicosSelecionados = formData.servicosSelecionados
        .map(id => servicos.find(s => s.id === id))
        .filter(Boolean) as typeof servicos;
      
      if (servicosSelecionados.length === 0) {
        toast.error("Serviço não encontrado");
        return;
      }
      
      const profissional = formData.profissional ? profissionais.find((p) => p.id === formData.profissional) : null;

      // Calcular desconto se houver promoção selecionada (baseado no preço total dos serviços)
      const precoTotal = servicosSelecionados.reduce((acc, s) => acc + s.preco, 0);
      let descontoAplicado = 0;
      if (formData.promocao && formData.promocao !== 'none') {
        const promocao = promocoes.find(p => p.id === formData.promocao);
        if (promocao) {
          if (promocao.desconto_porcentagem) {
            descontoAplicado = (precoTotal * promocao.desconto_porcentagem) / 100;
          } else if (promocao.desconto_valor) {
            descontoAplicado = promocao.desconto_valor;
          }
        }
      }

      // Criar ou atualizar cliente com data de nascimento
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: clienteExistente, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', formData.telefone)
        .maybeSingle();

      if (clienteError) {
        console.error("Erro ao buscar cliente:", clienteError);
        toast.error("Erro ao buscar cliente");
        return;
      }

      let clienteId = clienteExistente?.id;

      if (clienteExistente) {
        const updateData: any = { nome: formData.nome };
        // Só atualiza data de nascimento se foi preenchida (não sobrescreve com vazio)
        if (formData.dataNascimento) {
          updateData.data_nascimento = formData.dataNascimento;
        }
        const { error: updateError } = await supabase
          .from('clientes')
          .update(updateData)
          .eq('id', clienteExistente.id);
        
        if (updateError) {
          console.error("Erro ao atualizar cliente:", updateError);
          toast.error("Erro ao atualizar dados do cliente");
          return;
        }
      } else {
        const insertData: any = {
          nome: formData.nome,
          telefone: formData.telefone,
        };
        if (formData.dataNascimento) {
          insertData.data_nascimento = formData.dataNascimento;
        }
        const { data: novoCliente, error: insertError } = await supabase
          .from('clientes')
          .insert(insertData)
          .select()
          .single();
        
        if (insertError) {
          console.error("Erro ao criar cliente:", insertError);
          toast.error("Erro ao cadastrar cliente");
          return;
        }
        
        clienteId = novoCliente?.id;
      }

      // VALIDAÇÃO CRÍTICA: Verificar conflitos de horário considerando duração dos serviços
      const { data: agendamentosDia, error: checkError } = await supabase
        .from('agendamentos')
        .select('*, servico_id, origem')
        .eq('data', fmtKey(selectedDate))
        .neq('status', 'Cancelado');

      if (checkError) {
        console.error("Erro ao verificar disponibilidade:", checkError);
        toast.error("Erro ao verificar disponibilidade do horário");
        return;
      }

      // Calcular slots que TODOS os novos agendamentos vão ocupar
      const duracaoTotal = servicosSelecionados.reduce((acc, s) => acc + s.duracao, 0);
      const slotsNovoAgendamento = calcularHorariosBloqueados(formData.horario, duracaoTotal);

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

      // Criar agendamentos consecutivos para cada serviço
      const toMin = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      
      let horarioAtual = toMin(formData.horario);
      const nomesServicos = servicosSelecionados.map(s => s.nome).join(', ');
      
      for (let i = 0; i < servicosSelecionados.length; i++) {
        const serv = servicosSelecionados[i];
        const horarioStr = toHHMM(horarioAtual);
        
        await addAgendamento({
          data: fmtKey(selectedDate),
          horario: horarioStr,
          cliente_nome: formData.nome,
          cliente_telefone: formData.telefone,
          cliente_id: clienteId,
          servico_id: serv.id,
          servico_nome: serv.nome,
          profissional_id: formData.profissional || null,
          profissional_nome: profissional?.nome || null,
          status: "Confirmado",
          observacoes: servicosSelecionados.length > 1 
            ? `${formData.observacoes || ''} [Combo: ${nomesServicos}]`.trim()
            : (formData.observacoes || null),
          origem: "manual",
          promocao_id: i === 0 && formData.promocao && formData.promocao !== 'none' ? formData.promocao : null,
          desconto_aplicado: i === 0 ? descontoAplicado : 0,
        });
        
        // Avançar para o próximo horário baseado na duração do serviço atual
        horarioAtual += serv.duracao;
      }

      // Limpar cache para forçar atualização em outras abas
      sessionStorage.removeItem('agendamentos_cache');
      
      setOpenSuccessDialog(true);
      setFormData({ nome: "", telefone: "", dataNascimento: "", servicosSelecionados: [], profissional: undefined, horario: undefined, observacoes: "", promocao: "none" });
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      toast.error("Erro ao salvar agendamento. Tente novamente.");
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

  // Filtro de busca com priorização de matches exatos
  const agendamentosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const termo = searchTerm.toLowerCase().trim();
    
    const resultados = agendamentos.filter((ag) => {
      // Busca por nome
      if (ag.cliente_nome?.toLowerCase().includes(termo)) return true;
      
      // Busca por telefone (remove formatação)
      if (ag.cliente_telefone?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))) return true;
      
      // Busca por serviço
      if (ag.servico_nome?.toLowerCase().includes(termo)) return true;
      
      // Busca por profissional
      if (ag.profissional_nome?.toLowerCase().includes(termo)) return true;
      
      // Busca por data (formato DD/MM/YYYY)
      const [ano, mes, dia] = ag.data.split('-');
      const dataFormatada = `${dia}/${mes}/${ano}`;
      if (dataFormatada.includes(termo)) return true;
      
      // Busca por horário
      if (ag.horario.includes(termo)) return true;
      
      // Busca por status
      if (ag.status?.toLowerCase().includes(termo)) return true;
      
      return false;
    });

    // Ordenar por relevância: matches exatos primeiro, depois parciais
    return resultados.sort((a, b) => {
      // Calcular score de relevância
      const scoreA = (
        (a.cliente_nome?.toLowerCase() === termo ? 1000 : 0) +
        (a.cliente_telefone?.replace(/\D/g, '') === termo.replace(/\D/g, '') ? 1000 : 0) +
        (a.cliente_nome?.toLowerCase().startsWith(termo) ? 100 : 0) +
        (a.cliente_telefone?.replace(/\D/g, '').startsWith(termo.replace(/\D/g, '')) ? 100 : 0)
      );
      
      const scoreB = (
        (b.cliente_nome?.toLowerCase() === termo ? 1000 : 0) +
        (b.cliente_telefone?.replace(/\D/g, '') === termo.replace(/\D/g, '') ? 1000 : 0) +
        (b.cliente_nome?.toLowerCase().startsWith(termo) ? 100 : 0) +
        (b.cliente_telefone?.replace(/\D/g, '').startsWith(termo.replace(/\D/g, '')) ? 100 : 0)
      );
      
      // Se scores diferentes, ordenar por score
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      // Se scores iguais, ordenar por data mais recente
      if (a.data !== b.data) return b.data.localeCompare(a.data);
      return b.horario.localeCompare(a.horario);
    });
  }, [agendamentos, searchTerm]);

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
        <Button onClick={() => setOpenEscolhaClienteDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
        <Button variant="outline" onClick={() => setOpenBloqueioLoteDialog(true)}>
          <Lock className="w-4 h-4 mr-2" />
          Bloquear em Lote
        </Button>
      </div>

      {/* Barra de Busca */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nome, telefone, data, serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Resultados da Busca */}
        {searchTerm && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              {agendamentosFiltrados.length} resultado(s) encontrado(s)
            </p>
            
            {agendamentosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum agendamento encontrado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {agendamentosFiltrados.map((ag) => (
                  <Card
                    key={ag.id}
                    className="p-3 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedAgendamento(ag);
                      setOpenDetalhesDialog(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{ag.cliente_nome}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{ag.cliente_telefone}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1 text-sm">
                          <Scissors className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{ag.servico_nome}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span>
                            {format(new Date(ag.data + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })} às {ag.horario}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          ag.status === "Confirmado" 
                            ? "bg-success/20 text-success" 
                            : ag.status === "Cancelado"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {ag.status}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

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

      {/* Popup Fullscreen com Grid de Horários - Item 1 */}
      <DayGridDialog
        open={openSideSheet}
        onOpenChange={setOpenSideSheet}
        selectedDate={selectedDate}
        onDateChange={(date) => {
          setSelectedDate(date);
          // Buscar agendamentos em tempo real para o novo dia
          const fetchAgendamentos = async () => {
            const dateStr = fmtKey(date);
            const { data, error } = await supabase
              .from('agendamentos')
              .select('id, data, horario, cliente_nome, cliente_telefone, cliente_id, servico_id, servico_nome, profissional_id, profissional_nome, status, observacoes, origem')
              .eq('data', dateStr)
              .neq('status', 'Cancelado')
              .order('horario', { ascending: true });
            if (!error && data) {
              setAgendamentosDataAtual(data);
            }
          };
          fetchAgendamentos();
        }}
        agendamentosDia={agendamentosDia}
        dayConfig={selectedDate ? getDayData(selectedDate) : { fechado: false, horariosBloqueados: [], horariosExtras: [] }}
        servicos={servicos}
        onReservar={handleReservar}
        onGerenciar={handleGerenciar}
        onSelectAgendamento={(ag) => {
          setSelectedAgendamento(ag);
          setOpenDetalhesDialog(true);
        }}
        highlightedAgendamento={highlightedAgendamento}
      />

      {/* Dialog Escolha de Cliente (Novo ou Cadastrado) */}
      <Dialog open={openEscolhaClienteDialog} onOpenChange={setOpenEscolhaClienteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escolha o Tipo de Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              className="w-full h-auto py-6 flex flex-col gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all"
              onClick={handleEscolhaNovoCliente}
            >
              <UserPlus className="w-8 h-8" />
              <span className="text-lg font-semibold">Novo Cliente</span>
              <span className="text-xs opacity-80">Cadastrar um cliente pela primeira vez</span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-auto py-6 flex flex-col gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all"
              onClick={() => {
                setOpenEscolhaClienteDialog(false);
                setTipoCliente('cadastrado');
              }}
            >
              <UserCheck className="w-8 h-8" />
              <span className="text-lg font-semibold">Cliente Já Cadastrado</span>
              <span className="text-xs opacity-80">Buscar cliente existente no sistema</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Cliente Cadastrado com Autocomplete */}
      <Dialog open={tipoCliente === 'cadastrado'} onOpenChange={(open) => !open && setTipoCliente(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendamento - Cliente Cadastrado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Busca de Cliente */}
            <div className="space-y-2">
              <Label>Buscar Cliente *</Label>
              <Input
                placeholder="Digite o nome ou telefone do cliente..."
                onChange={(e) => handleBuscarCliente(e.target.value)}
                autoFocus
              />
              {clientesBusca.length > 0 && (
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {clientesBusca.map((cliente) => (
                    <div
                      key={cliente.id}
                      className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0 transition-colors"
                      onClick={() => handleSelecionarClienteCadastrado(cliente.id)}
                    >
                      <p className="font-medium">{cliente.nome}</p>
                      <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
                      {cliente.data_nascimento && (
                        <p className="text-xs text-muted-foreground">
                          Nascimento: {format(new Date(cliente.data_nascimento), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
            <div className="space-y-2">
              <Label>Data de Nascimento (opcional)</Label>
              <Input 
                type="date" 
                value={formData.dataNascimento} 
                onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })} 
                max={new Date().toISOString().split('T')[0]}
              />
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

            <div className="space-y-2">
              <Label>Serviços * (selecione 1 ou mais)</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {servicos.filter(s => s.ativo !== false).map((s) => (
                  <div key={s.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`servico-novo-${s.id}`}
                      checked={formData.servicosSelecionados.includes(s.id)}
                      onCheckedChange={(checked) => {
                        const newServicos = checked
                          ? [...formData.servicosSelecionados, s.id]
                          : formData.servicosSelecionados.filter(id => id !== s.id);
                        setFormData({ ...formData, servicosSelecionados: newServicos, horario: undefined });
                      }}
                    />
                    <label htmlFor={`servico-novo-${s.id}`} className="text-sm cursor-pointer">
                      {s.nome} ({s.duracao}min - R$ {s.preco})
                    </label>
                  </div>
                ))}
              </div>
              {formData.servicosSelecionados.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Duração total: {formData.servicosSelecionados.reduce((acc, id) => {
                    const serv = servicos.find(s => s.id === id);
                    return acc + (serv?.duracao || 0);
                  }, 0)}min
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={formData.profissional || undefined} onValueChange={(value) => setFormData({ ...formData, profissional: value })}>
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
            <div className="space-y-2">
              <Label>Horário *</Label>
              <Select
                value={formData.horario || undefined}
                onValueChange={(value) => setFormData({ ...formData, horario: value })}
                disabled={formData.servicosSelecionados.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.servicosSelecionados.length > 0 ? "Selecione um horário" : "Selecione um serviço primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {loadingDisponibilidade ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">Carregando horários...</div>
                  ) : (
                    getMultiServiceStartSlots(selectedDate, formData.servicosSelecionados, true).map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Promoção (opcional)</Label>
              <Select value={formData.promocao} onValueChange={(value) => setFormData({ ...formData, promocao: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem promoção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem promoção</SelectItem>
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

      {/* Dialog Reservar Horário (Cliente Cadastrado preenchido) */}
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
                <Input 
                  value={formData.nome} 
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })} 
                  required 
                  disabled={!!clienteCadastradoSelecionado}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input 
                  value={formData.telefone} 
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} 
                  required 
                  disabled={!!clienteCadastradoSelecionado}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento (opcional)</Label>
              <Input 
                type="date" 
                value={formData.dataNascimento} 
                onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })} 
                max={new Date().toISOString().split('T')[0]}
                disabled={!!clienteCadastradoSelecionado}
              />
            </div>
            <div className="space-y-2">
              <Label>Serviços * (selecione 1 ou mais)</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {servicos.filter(s => s.ativo !== false).map((s) => (
                  <div key={s.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`servico-reservar-${s.id}`}
                      checked={formData.servicosSelecionados.includes(s.id)}
                      onCheckedChange={(checked) => {
                        const newServicos = checked
                          ? [...formData.servicosSelecionados, s.id]
                          : formData.servicosSelecionados.filter(id => id !== s.id);
                        setFormData({ ...formData, servicosSelecionados: newServicos, horario: undefined });
                      }}
                    />
                    <label htmlFor={`servico-reservar-${s.id}`} className="text-sm cursor-pointer">
                      {s.nome} ({s.duracao}min - R$ {s.preco})
                    </label>
                  </div>
                ))}
              </div>
              {formData.servicosSelecionados.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Duração total: {formData.servicosSelecionados.reduce((acc, id) => {
                    const serv = servicos.find(s => s.id === id);
                    return acc + (serv?.duracao || 0);
                  }, 0)}min
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={formData.profissional || undefined} onValueChange={(value) => setFormData({ ...formData, profissional: value })}>
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
            <div className="space-y-2">
              <Label>Horário *</Label>
              <Select
                value={formData.horario || undefined}
                onValueChange={(value) => setFormData({ ...formData, horario: value })}
                disabled={formData.servicosSelecionados.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.servicosSelecionados.length > 0 ? "Selecione um horário" : "Selecione um serviço primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {loadingDisponibilidade ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">Carregando horários...</div>
                  ) : (
                    getMultiServiceStartSlots(selectedDate, formData.servicosSelecionados, true).map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Promoção (opcional)</Label>
              <Select value={formData.promocao} onValueChange={(value) => setFormData({ ...formData, promocao: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem promoção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem promoção</SelectItem>
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
                onClick={handleToggleFechado}
              >
                {gerenciarData.fechado ? "Reabrir Dia" : "Fechar"}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedAgendamento && (
            <div className="space-y-4">
              {/* Badge de Reagendamento - Item 4 */}
              {selectedAgendamento.observacoes?.includes('Reagendado') && (
                <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <RefreshCw className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-600">Reagendado</span>
                  <span className="text-xs text-amber-600/80 ml-auto">
                    {selectedAgendamento.observacoes.match(/Reagendado de (\d{2}\/\d{2}\/\d{4})/)?.[0] || 
                     selectedAgendamento.observacoes.match(/Reagendado a partir do dia: (\d{2}\/\d{2}\/\d{4})/)?.[0] ||
                     'Data anterior não registrada'}
                  </span>
                </div>
              )}

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
                <div className="flex items-center gap-2">
                  {selectedAgendamento.origem === 'bot' ? (
                    <>
                      <Bot className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Agendamento feito pelo Bot</span>
                    </>
                  ) : selectedAgendamento.origem === 'link_externo' ? (
                    <>
                      <Link2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Agendamento via Link Externo</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-600">Agendamento Manual</span>
                    </>
                  )}
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

              {/* Status de Pagamento, Confirmação e Atendimento */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
                <div 
                  className={`flex flex-col items-center p-2 rounded cursor-pointer transition-colors ${
                    selectedAgendamento.status_pagamento === 'pago' 
                      ? 'bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300' 
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200'
                  }`}
                  onClick={async () => {
                    const novoStatus = selectedAgendamento.status_pagamento === 'pago' ? 'pendente' : 'pago';
                    await updateAgendamento(selectedAgendamento.id, { status_pagamento: novoStatus });
                    setSelectedAgendamento({ ...selectedAgendamento, status_pagamento: novoStatus });
                  }}
                >
                  <DollarSign className={`w-5 h-5 ${selectedAgendamento.status_pagamento === 'pago' ? 'text-emerald-600' : 'text-zinc-400'}`} />
                  <span className={`text-[10px] font-medium mt-1 ${selectedAgendamento.status_pagamento === 'pago' ? 'text-emerald-700' : 'text-zinc-500'}`}>
                    {selectedAgendamento.status_pagamento === 'pago' ? 'Pago' : selectedAgendamento.status_pagamento === 'parcial' ? 'Parcial' : 'Pendente'}
                  </span>
                </div>
                
                <div 
                  className={`flex flex-col items-center p-2 rounded cursor-pointer transition-colors ${
                    selectedAgendamento.confirmado_cliente 
                      ? 'bg-blue-100 dark:bg-blue-950/50 border border-blue-300' 
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200'
                  }`}
                  onClick={async () => {
                    const novoStatus = !selectedAgendamento.confirmado_cliente;
                    await updateAgendamento(selectedAgendamento.id, { confirmado_cliente: novoStatus });
                    setSelectedAgendamento({ ...selectedAgendamento, confirmado_cliente: novoStatus });
                  }}
                >
                  <CheckCircle2 className={`w-5 h-5 ${selectedAgendamento.confirmado_cliente ? 'text-blue-600' : 'text-zinc-400'}`} />
                  <span className={`text-[10px] font-medium mt-1 ${selectedAgendamento.confirmado_cliente ? 'text-blue-700' : 'text-zinc-500'}`}>
                    {selectedAgendamento.confirmado_cliente ? 'Confirmado' : 'Não Confirmado'}
                  </span>
                </div>
                
                <div 
                  className={`flex flex-col items-center p-2 rounded cursor-pointer transition-colors ${
                    selectedAgendamento.atendido 
                      ? 'bg-amber-100 dark:bg-amber-950/50 border border-amber-300' 
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200'
                  }`}
                  onClick={async () => {
                    const novoStatus = !selectedAgendamento.atendido;
                    await updateAgendamento(selectedAgendamento.id, { atendido: novoStatus });
                    setSelectedAgendamento({ ...selectedAgendamento, atendido: novoStatus });
                  }}
                >
                  <UserCheck className={`w-5 h-5 ${selectedAgendamento.atendido ? 'text-amber-600' : 'text-zinc-400'}`} />
                  <span className={`text-[10px] font-medium mt-1 ${selectedAgendamento.atendido ? 'text-amber-700' : 'text-zinc-500'}`}>
                    {selectedAgendamento.atendido ? 'Atendido' : 'Não Atendido'}
                  </span>
                </div>
              </div>

              {/* Botões de ação extras - Item 2 e 10 */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setOpenEstenderDialog(true)}
                  className="gap-1"
                >
                  <Timer className="w-4 h-4" />
                  Estender Horário
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setOpenAdicionarServicoDialog(true)}
                  className="gap-1"
                >
                  <PlusCircle className="w-4 h-4" />
                  Adicionar Serviço
                </Button>
              </div>

              {/* Botão Registrar Pagamento - Item 10 */}
              <Button 
                onClick={() => {
                  const servico = servicos.find(s => s.id === selectedAgendamento.servico_id);
                  setPagamentoData({ valor: servico?.preco?.toString() || "", metodo: "PIX" });
                  setOpenPagamentoDialog(true);
                }}
                className="w-full gap-2"
                variant="default"
              >
                <DollarSign className="w-4 h-4" />
                Registrar Pagamento
              </Button>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenDetalhesDialog(false)}>Fechar</Button>
                <Button 
                  variant="secondary"
                  onClick={() => {
                    // Preencher formulário com dados do agendamento atual (serviço único para edição)
                    setFormData({
                      nome: selectedAgendamento.cliente_nome,
                      telefone: selectedAgendamento.cliente_telefone,
                      dataNascimento: '',
                      servicosSelecionados: selectedAgendamento.servico_id ? [selectedAgendamento.servico_id] : [],
                      profissional: selectedAgendamento.profissional_id || undefined,
                      horario: selectedAgendamento.horario,
                      observacoes: selectedAgendamento.observacoes || '',
                      promocao: selectedAgendamento.promocao_id || 'none',
                    });
                    setOpenDetalhesDialog(false);
                    setOpenEditarDialog(true);
                  }}
                >
                  Editar Agendamento
                </Button>
                {selectedAgendamento.status === "Cancelado" || isBefore(new Date(selectedAgendamento.data), startOfToday()) ? (
                  <Button variant="destructive" onClick={async () => {
                    await deleteAgendamento(selectedAgendamento.id);
                    setOpenDetalhesDialog(false);
                    setSelectedAgendamento(null);
                  }}>
                    Excluir Agendamento
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={async () => {
                    await cancelAgendamento(selectedAgendamento.id);
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

      {/* Dialog Registrar Pagamento no card - Item 10 */}
      <Dialog open={openPagamentoDialog} onOpenChange={setOpenPagamentoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {selectedAgendamento && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{selectedAgendamento.cliente_nome}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Serviço</p>
                <p className="font-medium">{selectedAgendamento.servico_nome}</p>
              </div>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pagamentoData.valor}
                  onChange={(e) => setPagamentoData({ ...pagamentoData, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Método de Pagamento</Label>
                <Select value={pagamentoData.metodo} onValueChange={(v) => setPagamentoData({ ...pagamentoData, metodo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                    <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenPagamentoDialog(false)}>Cancelar</Button>
                <Button onClick={async () => {
                  if (!pagamentoData.valor) {
                    toast.error("Informe o valor do pagamento");
                    return;
                  }
                  await addPagamento({
                    agendamento_id: selectedAgendamento.id,
                    cliente_nome: selectedAgendamento.cliente_nome,
                    servico: selectedAgendamento.servico_nome,
                    valor: parseFloat(pagamentoData.valor),
                    metodo_pagamento: pagamentoData.metodo,
                    status: "Pago",
                    data: selectedAgendamento.data,
                  });
                  toast.success("Pagamento registrado com sucesso!");
                  setOpenPagamentoDialog(false);
                  setOpenDetalhesDialog(false);
                }}>
                  Registrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Estender Horário - Item 2A */}
      <Dialog open={openEstenderDialog} onOpenChange={setOpenEstenderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estender Horário</DialogTitle>
          </DialogHeader>
          {selectedAgendamento && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Estender o atendimento de {selectedAgendamento.cliente_nome} por mais tempo
              </p>
              
              {/* Mostrar duração atual */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Serviço atual</p>
                <p className="font-medium">{selectedAgendamento.servico_nome}</p>
                <p className="text-xs text-muted-foreground">
                  Duração: {servicos.find(s => s.id === selectedAgendamento.servico_id)?.duracao || 60}min
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {[30, 60, 90, 120].map((min) => (
                  <Button
                    key={min}
                    variant={extensaoMinutos === min ? "default" : "outline"}
                    onClick={() => setExtensaoMinutos(min)}
                    className="w-full"
                  >
                    +{min >= 60 ? `${min / 60}h` : `${min}min`}
                  </Button>
                ))}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenEstenderDialog(false)}>Cancelar</Button>
                <Button onClick={async () => {
                  try {
                    const servicoAtual = servicos.find(s => s.id === selectedAgendamento.servico_id);
                    const duracaoAtual = servicoAtual?.duracao || 60;
                    const novaDuracao = duracaoAtual + extensaoMinutos;
                    
                    // Calcular novo horário de término
                    const [h, m] = selectedAgendamento.horario.split(':').map(Number);
                    const inicioMin = h * 60 + m;
                    const novoFimMin = inicioMin + novaDuracao;
                    const novoFimHorario = `${String(Math.floor(novoFimMin / 60)).padStart(2, '0')}:${String(novoFimMin % 60).padStart(2, '0')}`;
                    
                    // Atualizar agendamento com observação de extensão
                    await updateAgendamento(selectedAgendamento.id, {
                      observacoes: `${selectedAgendamento.observacoes || ''} [Estendido +${extensaoMinutos}min, término às ${novoFimHorario}]`.trim()
                    });
                    
                    // Bloquear os horários extras na configuração do dia
                    const dataStr = selectedAgendamento.data;
                    const config = getConfig(dataStr);
                    const horariosBloqueadosAtuais = config?.horarios_bloqueados || [];
                    
                    // Calcular horários que precisam ser bloqueados
                    const novosHorariosBloqueados: string[] = [];
                    const fimOriginalMin = inicioMin + duracaoAtual;
                    
                    for (let min = fimOriginalMin; min < novoFimMin; min += 30) {
                      const hh = String(Math.floor(min / 60)).padStart(2, '0');
                      const mm = String(min % 60).padStart(2, '0');
                      const slot = `${hh}:${mm}`;
                      if (!horariosBloqueadosAtuais.includes(slot)) {
                        novosHorariosBloqueados.push(slot);
                      }
                    }
                    
                    // Salvar na configuração do dia se houver novos bloqueios
                    if (novosHorariosBloqueados.length > 0) {
                      await updateConfig(dataStr, {
                        fechado: config?.fechado || false,
                        horarios_bloqueados: [...horariosBloqueadosAtuais, ...novosHorariosBloqueados],
                        horarios_extras: config?.horarios_extras || [],
                      });
                    }
                    
                    toast.success(`Horário estendido em ${extensaoMinutos} minutos! Término às ${novoFimHorario}`);
                    setOpenEstenderDialog(false);
                    setOpenDetalhesDialog(false);
                    refetchAgendamentos();
                    refetchConfig();
                  } catch (error) {
                    console.error("Erro ao estender horário:", error);
                    toast.error("Erro ao estender horário");
                  }
                }}>
                  Confirmar Extensão
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Serviço - Item 2B */}
      <Dialog open={openAdicionarServicoDialog} onOpenChange={(open) => {
        setOpenAdicionarServicoDialog(open);
        if (!open) {
          setServicoAdicionalId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Serviço</DialogTitle>
          </DialogHeader>
          {selectedAgendamento && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Adicionar outro serviço ao atendimento de {selectedAgendamento.cliente_nome}
              </p>
              
              {/* Mostrar serviço atual */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Serviço atual</p>
                <p className="font-medium">{selectedAgendamento.servico_nome}</p>
                <p className="text-xs text-muted-foreground">
                  Horário: {selectedAgendamento.horario.substring(0, 5)}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Selecione o serviço adicional</Label>
                <Select value={servicoAdicionalId} onValueChange={setServicoAdicionalId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicos
                      .filter(s => s.ativo !== false)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome} ({s.duracao}min - R$ {s.preco})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Preview do novo horário */}
              {servicoAdicionalId && (() => {
                // Buscar serviço atual pelo ID ou nome
                let servicoAtual = servicos.find(s => s.id === selectedAgendamento.servico_id);
                if (!servicoAtual && selectedAgendamento.servico_nome) {
                  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                  const nomeAlvo = normalize(selectedAgendamento.servico_nome.split(',')[0]);
                  servicoAtual = servicos.find(s => normalize(s.nome).includes(nomeAlvo) || nomeAlvo.includes(normalize(s.nome)));
                }
                const servicoAtualDuracao = servicoAtual?.duracao || 60;
                
                const horarioNorm = selectedAgendamento.horario.length > 5 
                  ? selectedAgendamento.horario.substring(0, 5) 
                  : selectedAgendamento.horario;
                const [h, m] = horarioNorm.split(':').map(Number);
                const inicioMin = h * 60 + m;
                const novoHorarioMin = inicioMin + servicoAtualDuracao;
                const novoHorario = `${String(Math.floor(novoHorarioMin / 60)).padStart(2, '0')}:${String(novoHorarioMin % 60).padStart(2, '0')}`;
                const servicoNovo = servicos.find(s => s.id === servicoAdicionalId);
                
                return (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                      Novo serviço será agendado às {novoHorario}
                    </p>
                    {servicoNovo && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-500">
                        {servicoNovo.nome} • {servicoNovo.duracao}min • R$ {servicoNovo.preco}
                      </p>
                    )}
                  </div>
                );
              })()}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setOpenAdicionarServicoDialog(false);
                  setServicoAdicionalId("");
                }}>
                  Cancelar
                </Button>
                <Button onClick={async () => {
                  if (!servicoAdicionalId) {
                    toast.error("Selecione um serviço");
                    return;
                  }
                  
                  try {
                    // Buscar duração do serviço atual pelo ID ou nome
                    let servicoAtual = servicos.find(s => s.id === selectedAgendamento.servico_id);
                    if (!servicoAtual && selectedAgendamento.servico_nome) {
                      const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                      const nomeAlvo = normalize(selectedAgendamento.servico_nome.split(',')[0]);
                      servicoAtual = servicos.find(s => normalize(s.nome).includes(nomeAlvo) || nomeAlvo.includes(normalize(s.nome)));
                    }
                    const servicoAtualDuracao = servicoAtual?.duracao || 60;
                    const servicoAtualNome = servicoAtual?.nome || selectedAgendamento.servico_nome || "Serviço anterior";
                    
                    const servicoNovo = servicos.find(s => s.id === servicoAdicionalId);
                    
                    if (!servicoNovo) {
                      toast.error("Serviço selecionado não encontrado");
                      return;
                    }
                    
                    // Normalizar horário removendo segundos se houver
                    const horarioNorm = selectedAgendamento.horario.length > 5 
                      ? selectedAgendamento.horario.substring(0, 5) 
                      : selectedAgendamento.horario;
                    
                    // Calcular novo horário após o serviço atual
                    const [h, m] = horarioNorm.split(':').map(Number);
                    const inicioMin = h * 60 + m;
                    const novoHorarioMin = inicioMin + servicoAtualDuracao;
                    const novoHorario = `${String(Math.floor(novoHorarioMin / 60)).padStart(2, '0')}:${String(novoHorarioMin % 60).padStart(2, '0')}`;
                    
                    // Criar novo agendamento consecutivo
                    await addAgendamento({
                      data: selectedAgendamento.data,
                      horario: novoHorario,
                      cliente_nome: selectedAgendamento.cliente_nome,
                      cliente_telefone: selectedAgendamento.cliente_telefone,
                      cliente_id: selectedAgendamento.cliente_id || null,
                      servico_id: servicoNovo.id,
                      servico_nome: servicoNovo.nome,
                      profissional_id: selectedAgendamento.profissional_id || null,
                      profissional_nome: selectedAgendamento.profissional_nome || null,
                      status: "Confirmado",
                      observacoes: `[Combo com ${servicoAtualNome}]`,
                      origem: "manual",
                    });
                    
                    toast.success(`Serviço ${servicoNovo.nome} adicionado às ${novoHorario}!`);
                    setOpenAdicionarServicoDialog(false);
                    setOpenDetalhesDialog(false);
                    setServicoAdicionalId("");
                    refetchAgendamentos();
                  } catch (error) {
                    console.error("Erro ao adicionar serviço:", error);
                    toast.error("Erro ao adicionar serviço. Tente novamente.");
                  }
                }}>
                  Adicionar Serviço
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Agendamento */}
      <Dialog open={openEditarDialog} onOpenChange={setOpenEditarDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar Agendamento - {selectedDate && format(selectedDate, "dd/MM/yyyy")}
            </DialogTitle>
          </DialogHeader>
          {selectedAgendamento && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!formData.nome || !formData.telefone || formData.servicosSelecionados.length === 0 || !formData.horario) {
                toast.error("Preencha todos os campos obrigatórios");
                return;
              }

              try {
                const servicoId = formData.servicosSelecionados[0];
                const servico = servicos.find((s) => s.id === servicoId);
                if (!servico) {
                  toast.error("Serviço não encontrado");
                  return;
                }
                
                const profissional = formData.profissional ? profissionais.find((p) => p.id === formData.profissional) : null;

                // Item 8: Detectar mudança de serviço e criar card no Fluxo de Caixa
                const servicoOriginalId = selectedAgendamento.servico_id;
                const servicoOriginal = servicos.find((s) => s.id === servicoOriginalId);
                
                if (servicoOriginalId !== servicoId && servicoOriginal && servico) {
                  const diferencaValor = servico.preco - servicoOriginal.preco;
                  
                  // Criar registro no Fluxo de Caixa se houve mudança de serviço
                  await addPagamento({
                    cliente_nome: selectedAgendamento.cliente_nome,
                    servico: `Alteração: ${servicoOriginal.nome} → ${servico.nome}`,
                    valor: Math.abs(diferencaValor),
                    metodo_pagamento: "Ajuste",
                    status: diferencaValor > 0 ? "Pendente" : "Ajuste",
                    data: format(new Date(), "yyyy-MM-dd"),
                    agendamento_id: selectedAgendamento.id,
                  });
                  
                  toast.info(`Ajuste de R$ ${Math.abs(diferencaValor).toFixed(2)} ${diferencaValor > 0 ? 'a receber' : 'registrado'} no Fluxo de Caixa`);
                }

                await updateAgendamento(selectedAgendamento.id, {
                  servico_id: servico.id,
                  servico_nome: servico.nome,
                  horario: formData.horario,
                  cliente_nome: formData.nome,
                  cliente_telefone: formData.telefone,
                  profissional_id: profissional?.id || null,
                  profissional_nome: profissional?.nome || null,
                  observacoes: formData.observacoes,
                });

                setOpenEditarDialog(false);
                setSelectedAgendamento(null);
                toast.success("Agendamento atualizado com sucesso!");
              } catch (error) {
                console.error("Erro ao atualizar agendamento:", error);
                toast.error("Erro ao atualizar agendamento");
              }
            }} className="space-y-4">
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
                  <Select 
                    value={formData.servicosSelecionados[0] || undefined} 
                    onValueChange={(value) => setFormData({ ...formData, servicosSelecionados: [value], horario: undefined })}
                  >
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
                  <Select value={formData.profissional || undefined} onValueChange={(value) => setFormData({ ...formData, profissional: value })}>
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
                  value={formData.horario || undefined}
                  onValueChange={(value) => setFormData({ ...formData, horario: value })}
                  disabled={formData.servicosSelecionados.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.servicosSelecionados.length > 0 ? "Selecione um horário" : "Selecione um serviço primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingDisponibilidade ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">Carregando horários...</div>
                    ) : (
                      getMultiServiceStartSlots(selectedDate, formData.servicosSelecionados, true).map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpenEditarDialog(false)}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Sucesso */}
      <Dialog open={openSuccessDialog} onOpenChange={(open) => {
        setOpenSuccessDialog(open);
        if (!open) {
          setOpenReservarDialog(false);
          setOpenNovoDialog(false);
          setClienteCadastradoSelecionado("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-full bg-green-500/10 p-4">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <DialogTitle className="text-2xl text-center">
                Agendamento criado com sucesso!
              </DialogTitle>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => {
                setOpenSuccessDialog(false);
                setOpenReservarDialog(false);
                setOpenNovoDialog(false);
                setClienteCadastradoSelecionado("");
              }}
              className="w-full sm:w-auto"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog Bloqueio em Lote */}
      <Dialog open={openBloqueioLoteDialog} onOpenChange={setOpenBloqueioLoteDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Bloquear Horários em Lote
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Período */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Período
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data Início</Label>
                  <Input
                    type="date"
                    value={bloqueioLoteData.dataInicio}
                    onChange={(e) => setBloqueioLoteData({ ...bloqueioLoteData, dataInicio: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data Fim</Label>
                  <Input
                    type="date"
                    value={bloqueioLoteData.dataFim}
                    onChange={(e) => setBloqueioLoteData({ ...bloqueioLoteData, dataFim: e.target.value })}
                    min={bloqueioLoteData.dataInicio}
                  />
                </div>
              </div>
            </div>

            {/* Dias da Semana */}
            <div className="space-y-3">
              <Label>Dias da Semana</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 1, label: "Seg" },
                  { value: 2, label: "Ter" },
                  { value: 3, label: "Qua" },
                  { value: 4, label: "Qui" },
                  { value: 5, label: "Sex" },
                  { value: 6, label: "Sáb" },
                  { value: 0, label: "Dom" },
                ].map((dia) => (
                  <label
                    key={dia.value}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                      bloqueioLoteData.diasSemana.includes(dia.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <Checkbox
                      checked={bloqueioLoteData.diasSemana.includes(dia.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBloqueioLoteData({
                            ...bloqueioLoteData,
                            diasSemana: [...bloqueioLoteData.diasSemana, dia.value],
                          });
                        } else {
                          setBloqueioLoteData({
                            ...bloqueioLoteData,
                            diasSemana: bloqueioLoteData.diasSemana.filter((d) => d !== dia.value),
                          });
                        }
                      }}
                      className="sr-only"
                    />
                    <span className="text-sm">{dia.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Horários a Bloquear */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Horários a Bloquear
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const todosHorarios: string[] = [];
                      for (let h = 8; h <= 19; h++) {
                        todosHorarios.push(`${h.toString().padStart(2, "0")}:00`);
                        if (h < 19) todosHorarios.push(`${h.toString().padStart(2, "0")}:30`);
                      }
                      setBloqueioLoteData({ ...bloqueioLoteData, horariosSelecionados: todosHorarios });
                    }}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBloqueioLoteData({ ...bloqueioLoteData, horariosSelecionados: [] })}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                {(() => {
                  const horarios: string[] = [];
                  for (let h = 8; h <= 19; h++) {
                    horarios.push(`${h.toString().padStart(2, "0")}:00`);
                    if (h < 19) horarios.push(`${h.toString().padStart(2, "0")}:30`);
                  }
                  return horarios.map((horario) => (
                    <label
                      key={horario}
                      className={`flex items-center justify-center px-2 py-2 rounded border cursor-pointer transition-colors text-sm ${
                        bloqueioLoteData.horariosSelecionados.includes(horario)
                          ? "bg-destructive text-destructive-foreground border-destructive"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <Checkbox
                        checked={bloqueioLoteData.horariosSelecionados.includes(horario)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBloqueioLoteData({
                              ...bloqueioLoteData,
                              horariosSelecionados: [...bloqueioLoteData.horariosSelecionados, horario].sort(),
                            });
                          } else {
                            setBloqueioLoteData({
                              ...bloqueioLoteData,
                              horariosSelecionados: bloqueioLoteData.horariosSelecionados.filter((h) => h !== horario),
                            });
                          }
                        }}
                        className="sr-only"
                      />
                      {horario}
                    </label>
                  ));
                })()}
              </div>
            </div>

            {/* Descrição/Motivo */}
            <div className="space-y-2">
              <Label>Motivo do Bloqueio (opcional)</Label>
              <Textarea
                placeholder="Ex: Horário de almoço, Compromisso pessoal, Férias..."
                value={bloqueioLoteData.descricao}
                onChange={(e) => setBloqueioLoteData({ ...bloqueioLoteData, descricao: e.target.value })}
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Preview */}
            {bloqueioLoteData.dataInicio && bloqueioLoteData.dataFim && bloqueioLoteData.horariosSelecionados.length > 0 && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Resumo:</p>
                <p className="text-muted-foreground">
                  {(() => {
                    try {
                      const inicio = parseISO(bloqueioLoteData.dataInicio);
                      const fim = parseISO(bloqueioLoteData.dataFim);
                      const dias = eachDayOfInterval({ start: inicio, end: fim }).filter((d) =>
                        bloqueioLoteData.diasSemana.includes(getDay(d))
                      );
                      return `${bloqueioLoteData.horariosSelecionados.length} horário(s) em ${dias.length} dia(s)`;
                    } catch {
                      return "";
                    }
                  })()}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenBloqueioLoteDialog(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !bloqueioLoteData.dataInicio ||
                !bloqueioLoteData.dataFim ||
                bloqueioLoteData.horariosSelecionados.length === 0 ||
                bloqueioLoteData.diasSemana.length === 0 ||
                salvandoBloqueioLote
              }
              onClick={async () => {
                try {
                  setSalvandoBloqueioLote(true);
                  const inicio = parseISO(bloqueioLoteData.dataInicio);
                  const fim = parseISO(bloqueioLoteData.dataFim);
                  const diasNoIntervalo = eachDayOfInterval({ start: inicio, end: fim }).filter((d) =>
                    bloqueioLoteData.diasSemana.includes(getDay(d))
                  );

                  let diasAtualizados = 0;
                  for (const dia of diasNoIntervalo) {
                    const dataStr = format(dia, "yyyy-MM-dd");
                    const configExistente = getConfig(dataStr);

                    const horariosAtuais = configExistente?.horarios_bloqueados || [];
                    const novosHorarios = Array.from(
                      new Set([...horariosAtuais, ...bloqueioLoteData.horariosSelecionados])
                    ).sort();

                    const observacoesAtuais = configExistente?.observacoes || "";
                    const novaObservacao = bloqueioLoteData.descricao
                      ? observacoesAtuais
                        ? `${observacoesAtuais}; ${bloqueioLoteData.descricao}`
                        : bloqueioLoteData.descricao
                      : observacoesAtuais;

                    await updateConfig(dataStr, {
                      horarios_bloqueados: novosHorarios,
                      observacoes: novaObservacao || null,
                    });
                    diasAtualizados++;
                  }

                  toast.success(`Horários bloqueados em ${diasAtualizados} dia(s)`);
                  setOpenBloqueioLoteDialog(false);
                  setBloqueioLoteData({
                    dataInicio: "",
                    dataFim: "",
                    horariosSelecionados: [],
                    descricao: "",
                    diasSemana: [1, 2, 3, 4, 5, 6],
                  });
                  refetchConfig();
                } catch (error) {
                  console.error("Erro ao bloquear horários:", error);
                  toast.error("Erro ao bloquear horários");
                } finally {
                  setSalvandoBloqueioLote(false);
                }
              }}
            >
              {salvandoBloqueioLote ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bloqueando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Bloquear Horários
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agenda;
