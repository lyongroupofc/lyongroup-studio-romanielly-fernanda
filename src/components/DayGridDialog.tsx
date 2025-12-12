import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Plus, Settings, Lock, User, Scissors, Clock } from "lucide-react";
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

const SLOT_HEIGHT = 48; // altura de cada slot de 30min em pixels

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
    return slots * SLOT_HEIGHT;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-[100dvh] max-h-[100dvh] p-0 m-0 rounded-none sm:rounded-none">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-4 border-b bg-background flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={navigatePrevDay}
                className="hover:shadow-lg hover:shadow-primary/20"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <DialogTitle className="text-center flex-1">
                <div className="flex flex-col">
                  <span className="text-lg font-bold">
                    {selectedDate && format(selectedDate, "dd/MM/yyyy")}
                  </span>
                  <span className="text-sm text-muted-foreground capitalize">
                    {selectedDate && getDayOfWeekName(selectedDate)}
                  </span>
                </div>
              </DialogTitle>
              
              <Button 
                variant="outline" 
                size="icon"
                onClick={navigateNextDay}
                className="hover:shadow-lg hover:shadow-primary/20"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <Button onClick={onReservar} className="flex-1 gap-2">
                <Plus className="w-4 h-4" />
                Reservar
              </Button>
              <Button variant="outline" onClick={onGerenciar} className="flex-1 gap-2">
                <Settings className="w-4 h-4" />
                Gerenciar Dia
              </Button>
            </div>
          </DialogHeader>

          {/* Grid de Horários */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              <div className="relative">
                {todosHorarios.map((horario, index) => {
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
                      className="flex gap-3 mb-1"
                      style={{ minHeight: status === 'agendado' && agendamento ? getAgendamentoHeight(agendamento) : SLOT_HEIGHT }}
                    >
                      {/* Coluna do horário */}
                      <div className="w-14 flex-shrink-0 text-sm font-medium text-muted-foreground pt-2">
                        {horario}
                      </div>
                      
                      {/* Coluna do conteúdo */}
                      <div className="flex-1">
                        {status === 'disponivel' && (
                          <div 
                            className="h-full min-h-[44px] rounded-lg border-2 border-dashed border-green-300 bg-green-50/50 dark:bg-green-950/20 flex items-center justify-center cursor-pointer hover:bg-green-100/50 dark:hover:bg-green-900/30 transition-colors"
                            onClick={onReservar}
                          >
                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                              Disponível
                            </span>
                          </div>
                        )}
                        
                        {status === 'bloqueado' && (
                          <div className="h-full min-h-[44px] rounded-lg border-2 border-red-300 bg-red-100/50 dark:bg-red-950/30 flex items-center gap-2 px-3">
                            <Lock className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                              Bloqueado
                            </span>
                          </div>
                        )}
                        
                        {status === 'agendado' && agendamento && (
                          <div 
                            className={`rounded-lg border-2 p-3 cursor-pointer transition-all hover:shadow-md ${
                              isHighlighted 
                                ? 'ring-2 ring-primary ring-offset-2 bg-primary/5 animate-pulse border-primary' 
                                : 'border-rose-300 bg-rose-100/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                            }`}
                            style={{ height: getAgendamentoHeight(agendamento) }}
                            onClick={() => onSelectAgendamento(agendamento)}
                          >
                            <div className="flex flex-col h-full justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                  <span className="font-semibold text-rose-900 dark:text-rose-100 truncate">
                                    {agendamento.cliente_nome}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Scissors className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                                  <span className="text-sm text-rose-700 dark:text-rose-300 truncate">
                                    {agendamento.servico_nome}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                                <span className="text-xs text-rose-600 dark:text-rose-400">
                                  {(() => {
                                    const servico = servicos.find(s => s.id === agendamento.servico_id);
                                    return servico ? `${servico.duracao}min` : '';
                                  })()}
                                </span>
                                {agendamento.status && (
                                  <Badge variant="outline" className="ml-auto text-xs px-1 py-0 border-rose-400 text-rose-600 dark:text-rose-300">
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
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
