import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Settings, Lock, User, Clock, DollarSign, CalendarCheck, Eye, EyeOff } from "lucide-react";
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

const SLOT_HEIGHT = 36;

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
  
  // Estado para toggle de visibilidade do valor estimado
  const [valorVisivel, setValorVisivel] = useState(true);
  
  // Verificar se o dia está fechado (fechado=true E sem horariosExtras)
  const isDiaFechado = dayConfig.fechado && (!dayConfig.horariosExtras || dayConfig.horariosExtras.length === 0);

  // Filtrar apenas agendamentos ativos
  const agendamentosAtivos = useMemo(() => {
    return agendamentosDia.filter(ag => ag.status !== 'Cancelado' && ag.status !== 'Excluido');
  }, [agendamentosDia]);

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
    agendamentosAtivos.forEach(ag => {
      const horarioNormalizado = ag.horario.length > 5 ? ag.horario.substring(0, 5) : ag.horario;
      map.set(horarioNormalizado, ag);
    });
    return map;
  }, [agendamentosAtivos]);

  // Calcular horários ocupados por agendamentos (considerando duração)
  const horariosOcupadosPorAgendamento = useMemo(() => {
    const ocupados = new Set<string>();
    agendamentosAtivos.forEach(ag => {
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
  }, [agendamentosAtivos, servicos]);

  // Calcular status de cada slot
  const getSlotStatus = (horario: string): 'disponivel' | 'agendado' | 'bloqueado' | 'ocupado' => {
    if (isDiaFechado) return 'bloqueado';
    if (dayConfig.horariosBloqueados.includes(horario)) return 'bloqueado';
    if (agendamentosPorHorario.has(horario)) return 'agendado';
    if (horariosOcupadosPorAgendamento.has(horario) && !agendamentosPorHorario.has(horario)) return 'ocupado';
    return 'disponivel';
  };

  // Calcular altura do bloco de agendamento baseado na duração
  const getAgendamentoHeight = (ag: Agendamento): number => {
    const servico = servicos.find(s => s.id === ag.servico_id);
    const duracao = servico?.duracao || 60;
    const slots = Math.ceil(duracao / 30);
    return slots * SLOT_HEIGHT - 4;
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
    const agendado = agendamentosAtivos.length;
    const bloqueado = dayConfig.horariosBloqueados.length;
    return { disponivel, agendado, bloqueado };
  }, [todosHorarios, agendamentosAtivos, dayConfig, isDiaFechado]);

  // Calcular valor total estimado - busca por ID ou nome do serviço
  const valorTotal = useMemo(() => {
    return agendamentosAtivos.reduce((acc, ag) => {
      let servico = servicos.find(s => s.id === ag.servico_id);
      // Fallback: buscar pelo nome se não encontrou pelo ID
      if (!servico && ag.servico_nome) {
        const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const nomeAlvo = normalize(ag.servico_nome.split(',')[0]);
        servico = servicos.find(s => normalize(s.nome).includes(nomeAlvo) || nomeAlvo.includes(normalize(s.nome)));
      }
      return acc + (servico?.preco || 0);
    }, 0);
  }, [agendamentosAtivos, servicos]);

  // Próximo horário disponível
  const proximoDisponivel = useMemo(() => {
    return todosHorarios.find(h => getSlotStatus(h) === 'disponivel');
  }, [todosHorarios, getSlotStatus]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-[100dvh] max-h-[100dvh] p-0 m-0 rounded-none sm:rounded-none border-0 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="flex flex-col h-full">
          
          {/* Header Minimalista */}
          <header className="flex-shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
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
              
              {/* Botões compactos */}
              <div className="flex gap-2 mt-3">
                <Button 
                  onClick={onReservar} 
                  size="sm"
                  className="flex-1 h-8 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg"
                >
                  <Plus className="w-3 h-3" />
                  Reservar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onGerenciar} 
                  className="flex-1 h-8 gap-1.5 border border-zinc-200 dark:border-zinc-700 text-xs font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <Settings className="w-3 h-3" />
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

          {/* Layout em Duas Colunas */}
          <div className="flex-1 flex flex-col lg:flex-row" style={{ minHeight: 0, overflow: 'hidden' }}>
            
            {/* Coluna Esquerda - Grid de Horários (scrollável) */}
            <div className="flex-1 lg:w-[55%] border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="px-3 py-3 space-y-1 pb-6">
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
                      className="flex gap-2 items-stretch"
                      style={{ 
                        minHeight: status === 'agendado' && agendamento 
                          ? getAgendamentoHeight(agendamento) 
                          : SLOT_HEIGHT - 4
                      }}
                    >
                      {/* Coluna do horário */}
                      <div className="w-12 flex-shrink-0 flex items-center justify-center">
                        <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                          {horario}
                        </span>
                      </div>
                      
                      {/* Coluna do conteúdo */}
                      <div className="flex-1">
                        {/* SLOT DISPONÍVEL - VERDE */}
                        {status === 'disponivel' && (
                          <div 
                            className="h-full min-h-[28px] rounded border border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10 flex items-center justify-center cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-colors"
                            onClick={onReservar}
                          >
                            <span className="text-[10px] text-emerald-500 dark:text-emerald-400">
                              Disponível
                            </span>
                          </div>
                        )}
                        
                        {/* SLOT BLOQUEADO - VERMELHO */}
                        {status === 'bloqueado' && (
                          <div className="h-full min-h-[28px] rounded border border-red-100 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10 flex items-center gap-1.5 px-2">
                            <Lock className="w-2.5 h-2.5 text-red-300" />
                            <span className="text-[10px] text-red-400 dark:text-red-500">
                              Bloqueado
                            </span>
                          </div>
                        )}
                        
                        {/* SLOT AGENDADO - DOURADO (compacto) */}
                        {status === 'agendado' && agendamento && (
                          <div 
                            className={`h-full rounded px-2 py-1.5 cursor-pointer transition-colors ${
                              isHighlighted 
                                ? 'ring-2 ring-amber-400 bg-amber-100 dark:bg-amber-900/50 border border-amber-400' 
                                : 'border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/80 dark:hover:bg-amber-900/30'
                            }`}
                            style={{ minHeight: getAgendamentoHeight(agendamento) }}
                            onClick={() => onSelectAgendamento(agendamento)}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                                <User className="w-2.5 h-2.5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-zinc-800 dark:text-white truncate leading-tight">
                                  {agendamento.cliente_nome}
                                </p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate leading-tight">
                                  {agendamento.servico_nome}
                                </p>
                              </div>
                              {agendamento.status && (
                                <Badge className="text-[9px] px-1 py-0 h-4 bg-amber-500 text-white border-0">
                                  {agendamento.status === 'Confirmado' ? '✓' : agendamento.status.charAt(0)}
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
            
            {/* Coluna Direita - Painel de Informações */}
            <div className="lg:w-[45%] bg-zinc-50/50 dark:bg-zinc-900/50 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="p-4 space-y-4">
                
                {/* Resumo do Dia */}
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                    Resumo do Dia
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                      <p className="text-lg font-bold text-emerald-600">{totais.disponivel}</p>
                      <p className="text-[10px] text-emerald-600/70">Livres</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded">
                      <p className="text-lg font-bold text-yellow-600">{totais.agendado}</p>
                      <p className="text-[10px] text-yellow-600/70">Agendados</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded">
                      <p className="text-lg font-bold text-red-500">{totais.bloqueado}</p>
                      <p className="text-[10px] text-red-500/70">Bloqueados</p>
                    </div>
                  </div>
                </div>

                {/* Valor Estimado */}
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-yellow-500" />
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase">Valor Estimado</p>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">
                          {valorVisivel ? `R$ ${valorTotal.toFixed(2)}` : "•••••"}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setValorVisivel(!valorVisivel)}
                      className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {valorVisivel ? <Eye className="w-4 h-4 text-zinc-400" /> : <EyeOff className="w-4 h-4 text-zinc-400" />}
                    </Button>
                  </div>
                </div>

                {/* Próximo Disponível */}
                {proximoDisponivel && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="text-[10px] text-emerald-600 uppercase">Próximo Disponível</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                          {proximoDisponivel}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista de Agendamentos */}
                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-yellow-500" />
                      <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        Agendamentos ({agendamentosAtivos.length})
                      </h3>
                    </div>
                  </div>
                  
                  <div className="max-h-[200px] overflow-y-auto">
                    {agendamentosAtivos.length === 0 ? (
                      <div className="p-4 text-center text-xs text-zinc-400">
                        Nenhum agendamento
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {agendamentosAtivos
                          .sort((a, b) => a.horario.localeCompare(b.horario))
                          .map(ag => {
                            const horarioNorm = ag.horario.length > 5 ? ag.horario.substring(0, 5) : ag.horario;
                            // Buscar serviço por ID ou nome
                            let servico = servicos.find(s => s.id === ag.servico_id);
                            if (!servico && ag.servico_nome) {
                              const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                              const nomeAlvo = normalize(ag.servico_nome.split(',')[0]);
                              servico = servicos.find(s => normalize(s.nome).includes(nomeAlvo) || nomeAlvo.includes(normalize(s.nome)));
                            }
                            return (
                              <div 
                                key={ag.id}
                                className="p-2.5 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 cursor-pointer transition-colors"
                                onClick={() => onSelectAgendamento(ag)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-yellow-600 w-10">{horarioNorm}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-zinc-800 dark:text-white truncate">
                                      {ag.cliente_nome}
                                    </p>
                                    <p className="text-[10px] text-zinc-500 truncate">
                                      {ag.servico_nome} {servico ? `• R$ ${servico.preco.toFixed(2)}` : ''}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
