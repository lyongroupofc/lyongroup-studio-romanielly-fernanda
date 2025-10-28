import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBotWhatsApp } from "@/hooks/useBotWhatsApp";
import { useBotConversas } from "@/hooks/useBotConversas";
import { MessageCircle, TrendingUp, Calendar, RefreshCw, Phone, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const BotWhatsApp = () => {
  const {
    loading,
    config,
    estatisticas,
    ativarBot,
    refetch,
  } = useBotWhatsApp();

  const {
    conversas,
    mensagens,
    loading: loadingConversas,
    conversaSelecionada,
    selecionarConversa,
  } = useBotConversas();

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bot WhatsApp</h1>
          <p className="text-muted-foreground">
            Configure e gerencie o assistente virtual
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas Hoje</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.conversas_hoje}</div>
            <p className="text-xs text-muted-foreground">
              {estatisticas.mensagens_hoje} mensagens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Bot</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.agendamentos_bot}</div>
            <p className="text-xs text-muted-foreground">Total criados pelo bot</p>
          </CardContent>
        </Card>
      </div>

      {/* Controle do Bot */}
      <Card>
        <CardHeader>
          <CardTitle>Bot</CardTitle>
          <CardDescription>
            Ative ou desative o atendimento automático pelo WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="bot-ativo">Bot Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativo, o bot responderá e agendará automaticamente
              </p>
            </div>
            <Switch id="bot-ativo" checked={config.ativo} onCheckedChange={ativarBot} />
          </div>
        </CardContent>
      </Card>

      {/* Conversas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversas Recentes
          </CardTitle>
          <CardDescription>
            Acompanhe as conversas do bot em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingConversas ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : conversas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma conversa ainda</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Lista de Conversas */}
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {conversas.map((conversa) => (
                    <button
                      key={conversa.id}
                      onClick={() => selecionarConversa(conversa.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-colors ${
                        conversaSelecionada === conversa.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Phone className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{conversa.contexto?.cliente_nome || conversa.telefone.replace('@s.whatsapp.net','')}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversa.ultimo_contato), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Mensagens */}
              <div className="border rounded-lg">
                {conversaSelecionada ? (
                  <ScrollArea className="h-[500px] p-4">
                    <div className="space-y-3">
                      {mensagens[conversaSelecionada]?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.tipo === 'enviada' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.tipo === 'enviada'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Selecione uma conversa</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BotWhatsApp;
