import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Settings, Lock, User, Scissors, Clock, Calendar } from "lucide-react";
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

const SLOT_HEIGHT = 56; // altura de cada slot de 30min em pixels

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
    return slots * SLOT_HEIGHT - 4; // -4 para gap
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
    const disponivel = todosHorarios.filter(h => getSlotStatus(h) === 'disponivel').length;
    const agendado = agendamentosDia.filter(ag => ag.status !== 'Cancelado' && ag.status !== 'Excluido').length;
    const bloqueado = dayConfig.horariosBloqueados.length;
    return { disponivel, agendado, bloqueado };
  }, [todosHorarios, agendamentosDia, dayConfig]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-[100dvh] max-h-[100dvh] p-0 m-0 rounded-none sm:rounded-none border-0 bg-gradient-to-b from-background to-muted/30">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header com gradiente dourado */}
          <DialogHeader className="p-4 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 flex-shrink-0 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={navigatePrevDay}
                className="text-white hover:bg-white/20 hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <DialogTitle className="text-center flex-1">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-white" />
                    <span className="text-xl font-bold text-white">
                      {selectedDate && format(selectedDate, "dd/MM/yyyy")}
                    </span>
                  </div>
                  <span className="text-sm text-white/80 capitalize font-medium">
                    {selectedDate && getDayOfWeekName(selectedDate)}
                  </span>
                </div>
              </DialogTitle>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={navigateNextDay}
                className="text-white hover:bg-white/20 hover:text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Resumo do dia */}
            <div className="flex justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-xs text-white font-medium">{totais.disponivel} livres</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                <div className="w-2 h-2 rounded-full bg-amber-300"></div>
                <span className="text-xs text-white font-medium">{totais.agendado} agendados</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-xs text-white font-medium">{totais.bloqueado} bloqueados</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <Button 
                onClick={onReservar} 
                className="flex-1 gap-2 bg-white text-amber-700 hover:bg-white/90 font-semibold shadow-md"
              >
                <Plus className="w-4 h-4" />
                Reservar
              </Button>
              <Button 
                variant="outline" 
                onClick={onGerenciar} 
                className="flex-1 gap-2 border-white/50 text-white hover:bg-white/20 hover:text-white font-semibold"
              >
                <Settings className="w-4 h-4" />
                Gerenciar
              </Button>
            </div>
          </DialogHeader>

          {/* Grid de Horários com scroll */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-4 pb-8 space-y-1">
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
                    className="flex gap-3"
                    style={{ 
                      minHeight: status === 'agendado' && agendamento 
                        ? getAgendamentoHeight(agendamento) 
                        : SLOT_HEIGHT - 4 
                    }}
                  >
                    {/* Coluna do horário */}
                    <div className="w-14 flex-shrink-0 flex items-start justify-end pt-3 pr-2">
                      <span className="text-sm font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                        {horario}
                      </span>
                    </div>
                    
                    {/* Coluna do conteúdo */}
                    <div className="flex-1">
                      {/* SLOT DISPONÍVEL - VERDE */}
                      {status === 'disponivel' && (
                        <div 
                          className="h-full min-h-[52px] rounded-xl border-2 border-dashed border-emerald-400/60 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 flex items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 transition-all hover:scale-[1.02] hover:shadow-md"
                          onClick={onReservar}
                        >
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
                              Disponível
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* SLOT BLOQUEADO - VERMELHO */}
                      {status === 'bloqueado' && (
                        <div className="h-full min-h-[52px] rounded-xl border-2 border-red-400/60 bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-950/40 dark:to-rose-950/40 flex items-center gap-3 px-4">
                          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </div>
                          <span className="text-sm text-red-700 dark:text-red-300 font-semibold">
                            Horário Bloqueado
                          </span>
                        </div>
                      )}
                      
                      {/* SLOT AGENDADO - DOURADO */}
                      {status === 'agendado' && agendamento && (
                        <div 
                          className={`rounded-xl border-2 p-3 cursor-pointer transition-all hover:shadow-lg ${
                            isHighlighted 
                              ? 'ring-2 ring-primary ring-offset-2 bg-primary/10 animate-pulse border-primary' 
                              : 'border-amber-400/70 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-amber-950/50 dark:via-yellow-950/50 dark:to-amber-950/50 hover:from-amber-100 hover:via-yellow-100 hover:to-amber-100 dark:hover:from-amber-900/60 dark:hover:to-amber-900/60 hover:border-amber-500 hover:scale-[1.01]'
                          }`}
                          style={{ height: getAgendamentoHeight(agendamento) }}
                          onClick={() => onSelectAgendamento(agendamento)}
                        >
                          <div className="flex flex-col h-full justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                                  <User className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                                </div>
                                <span className="font-bold text-amber-900 dark:text-amber-100 truncate text-base">
                                  {agendamento.cliente_nome}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 ml-9">
                                <Scissors className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span className="text-sm text-amber-800 dark:text-amber-200 truncate font-medium">
                                  {agendamento.servico_nome}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 ml-9">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                  {(() => {
                                    const servico = servicos.find(s => s.id === agendamento.servico_id);
                                    return servico ? `${servico.duracao} min` : '';
                                  })()}
                                </span>
                              </div>
                              {agendamento.status && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs px-2 py-0.5 border-amber-500/50 bg-amber-100/50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-semibold"
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
