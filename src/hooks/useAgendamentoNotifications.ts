import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Agendamento } from "./useAgendamentos";
import { Cliente } from "./useClientes";

export type AgendamentoNotification = {
  id: string;
  type: 'agendamento';
  eventType: 'novo' | 'cancelado' | 'excluido' | 'atualizado' | 'pagamento';
  agendamento: Agendamento;
  timestamp: Date;
  read: boolean;
};

export type AniversarianteNotification = {
  id: string;
  type: 'aniversario';
  cliente: Cliente;
  timestamp: Date;
  read: boolean;
};

export type Notification = AgendamentoNotification | AniversarianteNotification;

export const useAgendamentoNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Carregar aniversariantes do dia ao iniciar
  useEffect(() => {
    const loadAniversariantesDoDia = async () => {
      const hoje = new Date();
      const dia = hoje.getDate();
      const mes = hoje.getMonth();
      
      const { data: clientes, error } = await supabase
        .from('clientes')
        .select('*')
        .not('data_nascimento', 'is', null);
      
      if (clientes && !error) {
        const aniversariantes = clientes.filter((cliente) => {
          const dataNasc = new Date(cliente.data_nascimento + 'T00:00:00');
          return dataNasc.getDate() === dia && dataNasc.getMonth() === mes;
        });
        
        const aniversarianteNotifications: AniversarianteNotification[] = aniversariantes.map(cliente => ({
          id: `aniversario-${cliente.id}`,
          type: 'aniversario' as const,
          cliente: cliente as Cliente,
          timestamp: new Date(),
          read: false
        }));
        
        setNotifications(aniversarianteNotifications);
        setUnreadCount(aniversarianteNotifications.length);
      }
    };

    loadAniversariantesDoDia();
  }, []);

  // Função para tocar o som de notificação - som suave e elegante
  const playNotificationSound = useCallback(() => {
    const audio = new Audio('data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAASAAAeMwAUFBQUFCIiIiIiIjAwMDAwPj4+Pj4+TExMTExZWVlZWVlnZ2dnZ3V1dXV1dYODg4ODkZGRkZGRn5+fn5+frKysrKy6urq6urrIyMjIyNbW1tbW1uTk5OTk8vLy8vLy//////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAHjOZTf9/AAAAAAD/+xDEAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
    audio.volume = 0.25;
    audio.play().catch(err => console.log('Não foi possível tocar o som:', err));
  }, []);

  // Notificações em tempo real via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('agendamentos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendamentos'
        },
        (payload) => {
          console.log('📬 Nova notificação de agendamento:', payload);
          
          if (payload.eventType === 'INSERT') {
            const agendamento = payload.new as Agendamento;
            
            const newNotification: AgendamentoNotification = {
              id: `${agendamento.id}-${Date.now()}`,
              type: 'agendamento',
              eventType: 'novo',
              agendamento: agendamento,
              timestamp: new Date(),
              read: false
            };
            
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            playNotificationSound();
          } else if (payload.eventType === 'UPDATE') {
            const agendamento = payload.new as Agendamento;
            const oldAgendamento = payload.old as Agendamento;
            
            // Determinar o tipo de evento
            let eventType: 'cancelado' | 'excluido' | 'atualizado' | 'pagamento' = 'atualizado';
            
            if (agendamento.status === 'Cancelado' && oldAgendamento.status !== 'Cancelado') {
              eventType = 'cancelado';
            } else if (agendamento.status === 'Excluido' && oldAgendamento.status !== 'Excluido') {
              eventType = 'excluido';
            }
            
            const newNotification: AgendamentoNotification = {
              id: `${agendamento.id}-${Date.now()}`,
              type: 'agendamento',
              eventType: eventType,
              agendamento: agendamento,
              timestamp: new Date(),
              read: false
            };
            
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            playNotificationSound();
          }
        }
      )
      .subscribe();

    // Subscription para novos clientes (aniversariantes)
    const clientesChannel = supabase
      .channel('clientes-aniversariantes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const cliente = payload.new as Cliente;
            
            if (cliente.data_nascimento) {
              const hoje = new Date();
              const dataNasc = new Date(cliente.data_nascimento + 'T00:00:00');
              
              // Se é aniversário hoje
              if (dataNasc.getDate() === hoje.getDate() && dataNasc.getMonth() === hoje.getMonth()) {
                const newNotification: AniversarianteNotification = {
                  id: `aniversario-${cliente.id}`,
                  type: 'aniversario',
                  cliente: cliente,
                  timestamp: new Date(),
                  read: false
                };
                
                setNotifications(prev => [newNotification, ...prev]);
                setUnreadCount(prev => prev + 1);
                playNotificationSound();
              }
            }
          }
        }
      )
      .subscribe();

    // Subscription para pagamentos
    const pagamentosChannel = supabase
      .channel('pagamentos-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pagamentos'
        },
        async (payload) => {
          const pagamento = payload.new as any;
          
          // Buscar agendamento relacionado
          if (pagamento.agendamento_id) {
            const { data: agendamento } = await supabase
              .from('agendamentos')
              .select('*')
              .eq('id', pagamento.agendamento_id)
              .single();
            
            if (agendamento) {
              const newNotification: AgendamentoNotification = {
                id: `pagamento-${pagamento.id}-${Date.now()}`,
                type: 'agendamento',
                eventType: 'pagamento',
                agendamento: agendamento as Agendamento,
                timestamp: new Date(),
                read: false
              };
              
              setNotifications(prev => [newNotification, ...prev]);
              setUnreadCount(prev => prev + 1);
              playNotificationSound();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(clientesChannel);
      supabase.removeChannel(pagamentosChannel);
    };
  }, [playNotificationSound]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => {
      const notification = notifications.find(n => n.id === notificationId);
      return notification && !notification.read ? Math.max(0, prev - 1) : prev;
    });
  }, [notifications]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications
  };
};
