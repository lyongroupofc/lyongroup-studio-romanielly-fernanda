import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Agendamento } from "./useAgendamentos";

export type AgendamentoNotification = {
  id: string;
  agendamento: Agendamento;
  timestamp: Date;
  read: boolean;
};

export const useAgendamentoNotifications = () => {
  const [notifications, setNotifications] = useState<AgendamentoNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Função para tocar o som de notificação
  const playNotificationSound = useCallback(() => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSoFJHfH8N+RQAoUXrTp66hVFApGn+DyvmwhBg==');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Não foi possível tocar o som:', err));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('new_agendamentos')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agendamentos'
        },
        (payload) => {
          const newAgendamento = payload.new as Agendamento;
          
          // Criar notificação
          const notification: AgendamentoNotification = {
            id: newAgendamento.id,
            agendamento: newAgendamento,
            timestamp: new Date(),
            read: false
          };

          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Tocar som de notificação
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
