import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Settings, Lock, User } from "lucide-react";
import { type Agendamento } from "@/hooks/useAgendamentos";

interface Servico {
  id: string;
  nome: string;
  duracao: number;
  preco: number;
}

interface DayConfig {
  fechado: boolean;
  horariosBloqueados: string[];
  horariosExtras: string[];
}

interface DayGridDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | undefined;
  onDateChange: (date: Date) => void;
  agendamentosDia: Agendamento[];
  dayConfig: DayConfig;
  servicos: Servico[];
  onReservar: () => void;
  onGerenciar: () => void;
  onSelectAgendamento: (ag: Agendamento) => void;
  highlightedAgendamento?: string | null;
}

const SLOT_HEIGHT = 40;

export function DayGridDialog({
  open,
  onOpenChange,
  selectedDate,
  onDateChange,
  agendamentosDia,
  dayConfig,
  servicos,
  onReservar,
  onGerenciar,
  onSelectAgendamento,
  highlightedAgendamento,
}: DayGridDialogProps) {
  
  // Verificar se o dia está fechado (fechado=true E sem horariosExtras)
  const isDiaFechado = dayConfig.fechado && (!dayConfig.horariosExtras || dayConfig.horariosExtras.length === 0);

  // Gerar todos os horários do dia (08:00 às 20:00)
  const todosHorarios = useMemo(() => {
    const slots: string[] = [];
    for (let h = 8; h <= 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 20 && m === 30) continue;
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  }, []);

  // Mapear agendamentos por horário de início
  const agendamentosPorHorario = useMemo(() => {
    const map = new Map<string, Agendamento>();
    agendamentosDia
      .filter(ag => ag.status !== 'Cancelado' && ag.status !== 'Excluido')
      .forEach(ag => {
        const horarioNormalizado = ag.horario.length > 5 ? ag.horario.substring(0, 5) : ag.horario;
        map.set(horarioNormalizado, ag);
      });
    return map;
  }, [agendamentosDia]);

  // Calcular horários ocupados por agendamentos (considerando duração)
  const horariosOcupadosPorAgendamento = useMemo(() => {
    const ocupados = new Set<string>();
    agendamentosDia
      .filter(ag => ag.status !== 'Cancelado' && ag.status !== 'Excluido')
      .forEach(ag => {
        const horarioNormalizado = ag.horario.length > 5 ? ag.horario.substring(0, 5) : ag.horario;
        const servico = servicos.find(s => s.id === ag.servico_id);
        const duracao = servico?.duracao || 60;
        
        const [h, m] = horarioNormalizado.split(':').map(Number);
        const inicioMin = h * 60 + m;
        
        for (let min = inicioMin; min < inicioMin + duracao; min += 30) {
          const hh = String(Math.floor(min / 60)).padStart(2, '0');
          const mm = String(min % 60).padStart(2, '0');
          ocupados.add(`${hh}:${mm}`);
        }
      });
    return ocupados;
  }, [agendamentosDia, servicos]);

  // Calcular status de cada slot
  const getSlotStatus = (horario: string): 'disponivel' | 'agendado' | 'bloqueado' | 'ocupado' => {
    // Se dia está fechado, tudo é bloqueado
    if (isDiaFechado) {
      return 'bloqueado';
    }
    
    // Verificar se é bloqueado manualmente
    if (dayConfig.horariosBloqueados.includes(horario)) {
      return 'bloqueado';
    }
    
    // Verificar se tem agendamento iniciando neste horário
    if (agendamentosPorHorario.has(horario)) {
      return 'agendado';
    }
    
    // Verificar se está ocupado por agendamento anterior (duração)
    if (horariosOcupadosPorAgendamento.has(horario) && !agendamentosPorHorario.has(horario)) {
      return 'ocupado';
    }
    
    return 'disponivel';
  };

  // Calcular altura do bloco de agendamento baseado na duração
  const getAgendamentoHeight = (ag: Agendamento): number => {
    const servico = servicos.find(s => s.id === ag.servico_id);
    const duracao = servico?.duracao || 60;
    const slots = Math.ceil(duracao / 30);
    return slots * SLOT_HEIGHT - 8;
  };

  const navigatePrevDay = () => {
    if (selectedDate) {
      const prevDay = new Date(selectedDate);
      prevDay.setDate(prevDay.getDate() - 1);
      onDateChange(prevDay);
    }
  };

  const navigateNextDay = () => {
    if (selectedDate) {
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      onDateChange(nextDay);
    }
  };

  const getDayOfWeekName = (date: Date): string => {
    return format(date, "EEEE", { locale: ptBR });
  };

  // Contar totais
  const totais = useMemo(() => {
    if (isDiaFechado) {
      return { disponivel: 0, agendado: 0, bloqueado: todosHorarios.length };
    }
    const disponivel = todosHorarios.filter(h => getSlotStatus(h) === 'disponivel').length;
    const agendado = agendamentosDia.filter(ag => ag.status !== 'Cancelado' && ag.status !== 'Excluido').length;
    const bloqueado = dayConfig.horariosBloqueados.length;
    return { disponivel, agendado, bloqueado };
  }, [todosHorarios, agendamentosDia, dayConfig, isDiaFechado]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-[100dvh] max-h-[100dvh] p-0 m-0 rounded-none sm:rounded-none border-0 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="flex flex-col h-full relative">
          
          {/* Elementos decorativos sutis */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-10 w-20 h-20 rounded-full bg-amber-200/10 blur-2xl" />
            <div className="absolute bottom-40 left-5 w-16 h-16 rounded-full bg-amber-300/10 blur-xl" />
          </div>

          {/* Header Minimalista */}
          <header className="relative flex-shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
            <div className="h-0.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
            
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={navigatePrevDay}
                  className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-4 w-4 text-zinc-500" />
                </Button>
                
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h2>
                  <p className="text-xs text-amber-600 dark:text-amber-400 capitalize">
                    {selectedDate && getDayOfWeekName(selectedDate)}
                  </p>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={navigateNextDay}
                  className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                </Button>
              </div>
              
              {/* Resumo compacto */}
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{totais.disponivel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{totais.agendado}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{totais.bloqueado}</span>
                </div>
              </div>
              
              {/* Botões compactos */}
              <div className="flex gap-2 mt-3">
                <Button 
                  onClick={onReservar} 
                  size="sm"
                  className="flex-1 h-9 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Reservar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onGerenciar} 
                  className="flex-1 h-9 gap-1.5 border border-zinc-200 dark:border-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Gerenciar
                </Button>
              </div>
            </div>
          </header>

          {/* Aviso de dia fechado */}
          {isDiaFechado && (
            <div className="mx-4 mt-3 px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700 dark:text-red-300 font-medium">Dia fechado</span>
            </div>
          )}

          {/* Grid de Horários */}
          <div className="flex-1 overflow-y-auto overscroll-contain relative z-10">
            <div className="px-4 py-3 space-y-2 pb-6">
              {todosHorarios.map((horario) => {
                const status = getSlotStatus(horario);
                const agendamento = agendamentosPorHorario.get(horario);
                const isHighlighted = agendamento?.id === highlightedAgendamento;
                
                if (status === 'ocupado') {
                  return null;
                }
                
                return (
                  <div 
                    key={horario} 
                    className="flex gap-3 items-stretch"
                    style={{ 
                      minHeight: status === 'agendado' && agendamento 
                        ? getAgendamentoHeight(agendamento) 
                        : SLOT_HEIGHT - 8
                    }}
                  >
                    {/* Coluna do horário */}
                    <div className="w-14 flex-shrink-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {horario}
                      </span>
                    </div>
                    
                    {/* Coluna do conteúdo */}
                    <div className="flex-1">
                      {/* SLOT DISPONÍVEL - VERDE */}
                      {status === 'disponivel' && (
                        <div 
                          className="h-full min-h-[32px] rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-center cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:border-emerald-400 transition-colors"
                          onClick={onReservar}
                        >
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">
                            Disponível
                          </span>
                        </div>
                      )}
                      
                      {/* SLOT BLOQUEADO - VERMELHO */}
                      {status === 'bloqueado' && (
                        <div className="h-full min-h-[32px] rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 flex items-center gap-2 px-3">
                          <Lock className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-red-600 dark:text-red-400">
                            Bloqueado
                          </span>
                        </div>
                      )}
                      
                      {/* SLOT AGENDADO - DOURADO */}
                      {status === 'agendado' && agendamento && (
                        <div 
                          className={`h-full rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                            isHighlighted 
                              ? 'ring-2 ring-amber-400 bg-amber-100 dark:bg-amber-900/50 border-amber-400' 
                              : 'border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                          }`}
                          style={{ minHeight: getAgendamentoHeight(agendamento) }}
                          onClick={() => onSelectAgendamento(agendamento)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                {agendamento.cliente_nome}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                {agendamento.servico_nome}
                              </p>
                            </div>
                            {agendamento.status && (
                              <Badge className="text-[10px] px-1.5 py-0.5 bg-amber-500 text-white border-0">
                                {agendamento.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
