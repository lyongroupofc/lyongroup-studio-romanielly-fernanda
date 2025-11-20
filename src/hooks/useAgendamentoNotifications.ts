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

  // Função para tocar o som de notificação - som suave e elegante
  const playNotificationSound = useCallback(() => {
    // Som de sino delicado e feminino
    const audio = new Audio('data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAASAAAeMwAUFBQUFCIiIiIiIjAwMDAwPj4+Pj4+TExMTExZWVlZWVlnZ2dnZ3V1dXV1dYODg4ODkZGRkZGRn5+fn5+frKysrKy6urq6urrIyMjIyNbW1tbW1uTk5OTk8vLy8vLy//////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAHjOZTf9/AAAAAAD/+xDEAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
    audio.volume = 0.25; // Volume mais baixo e suave
    audio.play().catch(err => console.log('Não foi possível tocar o som:', err));
  }, []);

  // Polling para verificar novos agendamentos a cada 60 segundos
  useEffect(() => {
    let lastCheckTime = new Date();
    let isChecking = false;

    const checkNewAppointments = async () => {
      // Evitar múltiplas chamadas simultâneas
      if (isChecking || document.hidden) return;
      
      isChecking = true;
      try {
        const { data, error } = await supabase
          .from("agendamentos")
          .select("*")
          .gte("created_at", lastCheckTime.toISOString())
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Erro ao verificar novos agendamentos:", error);
          return;
        }

        if (data && data.length > 0) {
          // Adicionar novas notificações
          const newNotifications = data.map(agendamento => ({
            id: agendamento.id,
            agendamento: agendamento as Agendamento,
            timestamp: new Date(),
            read: false
          }));

          setNotifications(prev => [...newNotifications, ...prev]);
          setUnreadCount(prev => prev + newNotifications.length);
          
          // Tocar som apenas uma vez
          playNotificationSound();
          
          // Atualizar timestamp
          lastCheckTime = new Date();
        }
      } catch (error) {
        console.error("Erro ao verificar novos agendamentos:", error);
      } finally {
        isChecking = false;
      }
    };

    const interval = setInterval(checkNewAppointments, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
