import { Bell, X, Bot, Link2, UserPlus, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAgendamentoNotifications } from "@/hooks/useAgendamentoNotifications";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAllNotifications } = useAgendamentoNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    if (notification.type === 'agendamento') {
      // Navegar para a agenda com o agendamento específico
      navigate(`/admin/agenda?date=${notification.agendamento.data}&highlight=${notification.agendamento.id}`);
    } else if (notification.type === 'aniversario') {
      // Navegar para aniversariantes
      navigate('/admin/aniversariantes');
    }
  };

  const formatNotificationTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}m atrás`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    return format(timestamp, "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  const getOrigemInfo = (origem: string | null) => {
    if (origem === 'bot') {
      return {
        icon: Bot,
        label: 'WhatsApp Bot',
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      };
    }
    if (origem === 'link_externo') {
      return {
        icon: Link2,
        label: 'Link Externo',
        className: 'bg-green-500/10 text-green-600 dark:text-green-400'
      };
    }
    return {
      icon: UserPlus,
      label: 'Manual',
      className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    };
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                Marcar como lidas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="text-xs"
              >
                Limpar tudo
              </Button>
            </div>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                if (notification.type === 'aniversario') {
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors relative group ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="flex items-start gap-3">
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">
                              🎂 Aniversário Hoje!
                            </p>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pink-500/10 text-pink-600 dark:text-pink-400">
                              <Cake className="w-3 h-3" />
                              <span>Aniversariante</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.cliente.nome} está fazendo aniversário hoje!
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatNotificationTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Notificação de agendamento
                const [yyyy, mm, dd] = notification.agendamento.data.split('-');
                const origemInfo = getOrigemInfo(notification.agendamento.origem);
                const OrigemIcon = origemInfo.icon;
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors relative group ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notification.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="flex items-start gap-3">
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">
                            Novo Agendamento
                          </p>
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${origemInfo.className}`}>
                            <OrigemIcon className="w-3 h-3" />
                            <span>{origemInfo.label}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.agendamento.cliente_nome} - {notification.agendamento.servico_nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dd}/{mm}/{yyyy} às {notification.agendamento.horario.substring(0, 5)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatNotificationTime(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
