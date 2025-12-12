import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Settings, Lock, User, Scissors, Clock, Calendar, Sparkles } from "lucide-react";
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

const SLOT_HEIGHT = 64;

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
          
          {/* Elementos decorativos dourados sutis */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-10 w-32 h-32 rounded-full bg-gradient-to-br from-amber-200/20 to-yellow-300/10 blur-3xl" />
            <div className="absolute bottom-40 left-5 w-24 h-24 rounded-full bg-gradient-to-tr from-amber-300/15 to-yellow-200/10 blur-2xl" />
            <Sparkles className="absolute top-40 right-8 w-4 h-4 text-amber-300/30 animate-pulse" />
            <Sparkles className="absolute bottom-60 left-12 w-3 h-3 text-amber-400/25 animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Header Premium */}
          <header className="relative flex-shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
            {/* Linha dourada decorativa no topo */}
            <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
            
            <div className="px-4 py-5">
              {/* Navegação e Data */}
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={navigatePrevDay}
                  className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-amber-300 transition-all"
                >
                  <ChevronLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </Button>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                      {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    </h2>
                  </div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium capitalize">
                    {selectedDate && getDayOfWeekName(selectedDate)}
                  </p>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={navigateNextDay}
                  className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-amber-300 transition-all"
                >
                  <ChevronRight className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </Button>
              </div>
              
              {/* Resumo do dia */}
              <div className="flex justify-center gap-3 mt-4">
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-4 py-1.5 border border-emerald-200 dark:border-emerald-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{totais.disponivel}</span>
                </div>
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 rounded-full px-4 py-1.5 border border-amber-200 dark:border-amber-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{totais.agendado}</span>
                </div>
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 rounded-full px-4 py-1.5 border border-red-200 dark:border-red-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">{totais.bloqueado}</span>
                </div>
              </div>
              
              {/* Botões de Ação */}
              <div className="flex gap-3 mt-5">
                <Button 
                  onClick={onReservar} 
                  className="flex-1 h-11 gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  Reservar Horário
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onGerenciar} 
                  className="flex-1 h-11 gap-2 border-2 border-zinc-200 dark:border-zinc-700 hover:border-amber-400 dark:hover:border-amber-500 font-semibold rounded-xl transition-all hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <Settings className="w-4 h-4" />
                  Gerenciar Dia
                </Button>
              </div>
            </div>
          </header>

          {/* Aviso de dia fechado */}
          {isDiaFechado && (
            <div className="mx-4 mt-4 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-red-800 dark:text-red-200">Dia Fechado</p>
                <p className="text-sm text-red-600 dark:text-red-400">Este dia está bloqueado para agendamentos</p>
              </div>
            </div>
          )}

          {/* Grid de Horários */}
          <div className="flex-1 overflow-y-auto overscroll-contain relative z-10">
            <div className="p-4 space-y-3 pb-8">
              {todosHorarios.map((horario) => {
                const status = getSlotStatus(horario);
                const agendamento = agendamentosPorHorario.get(horario);
                const isHighlighted = agendamento?.id === highlightedAgendamento;
                
                // Se é um slot ocupado por agendamento anterior, não renderizar
                if (status === 'ocupado') {
                  return null;
                }
                
                return (
                  <div 
                    key={horario} 
                    className="flex gap-4 items-stretch"
                    style={{ 
                      minHeight: status === 'agendado' && agendamento 
                        ? getAgendamentoHeight(agendamento) 
                        : SLOT_HEIGHT - 8
                    }}
                  >
                    {/* Coluna do horário */}
                    <div className="w-16 flex-shrink-0 flex items-start justify-center pt-3">
                      <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                        {horario}
                      </span>
                    </div>
                    
                    {/* Coluna do conteúdo */}
                    <div className="flex-1">
                      {/* SLOT DISPONÍVEL - VERDE */}
                      {status === 'disponivel' && (
                        <div 
                          className="h-full min-h-[56px] rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 flex items-center justify-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-900/40 dark:hover:to-green-900/40 transition-all duration-200 hover:shadow-md hover:shadow-emerald-500/10 group"
                          onClick={onReservar}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
                              Disponível
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* SLOT BLOQUEADO - VERMELHO */}
                      {status === 'bloqueado' && (
                        <div className="h-full min-h-[56px] rounded-2xl border-2 border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40 flex items-center gap-4 px-4">
                          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-red-500 dark:text-red-400" />
                          </div>
                          <span className="text-sm text-red-700 dark:text-red-300 font-semibold">
                            Bloqueado
                          </span>
                        </div>
                      )}
                      
                      {/* SLOT AGENDADO - DOURADO */}
                      {status === 'agendado' && agendamento && (
                        <div 
                          className={`h-full rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 ${
                            isHighlighted 
                              ? 'ring-2 ring-amber-500 ring-offset-2 bg-amber-100 dark:bg-amber-900/50 animate-pulse border-amber-500' 
                              : 'border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/50 dark:via-yellow-950/40 dark:to-orange-950/30 hover:from-amber-100 hover:via-yellow-100 hover:to-orange-100 dark:hover:from-amber-900/60 dark:hover:via-yellow-900/50 dark:hover:to-orange-900/40 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-lg hover:shadow-amber-500/15'
                          }`}
                          style={{ minHeight: getAgendamentoHeight(agendamento) }}
                          onClick={() => onSelectAgendamento(agendamento)}
                        >
                          <div className="flex flex-col h-full justify-between">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md shadow-amber-500/30">
                                  <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-zinc-900 dark:text-white truncate text-base">
                                    {agendamento.cliente_nome}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-13 pl-13">
                                <Scissors className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate font-medium">
                                  {agendamento.servico_nome}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                                  {(() => {
                                    const servico = servicos.find(s => s.id === agendamento.servico_id);
                                    return servico ? `${servico.duracao} min` : '';
                                  })()}
                                </span>
                              </div>
                              {agendamento.status && (
                                <Badge 
                                  className="text-xs px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 font-semibold shadow-sm"
                                >
                                  {agendamento.status}
                                </Badge>
                              )}
                            </div>
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
