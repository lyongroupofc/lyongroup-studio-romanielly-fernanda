import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useBotWhatsApp } from "@/hooks/useBotWhatsApp";
import { MessageCircle, QrCode, TrendingUp, Calendar, Clock, RefreshCw } from "lucide-react";

const BotWhatsApp = () => {
  const {
    loading,
    status,
    qrCode,
    config,
    estatisticas,
    gerarQRCode,
    ativarBot,
    atualizarConfig,
    refetch,
  } = useBotWhatsApp();

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

      {/* Status e Estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Conexão</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={status === 'conectado' ? 'default' : 'destructive'}>
                {status === 'conectado' ? '🟢 Conectado' : '🔴 Desconectado'}
              </Badge>
            </div>
          </CardContent>
        </Card>

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

      {/* QR Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Conexão WhatsApp
          </CardTitle>
          <CardDescription>
            Escaneie o QR Code com seu WhatsApp para conectar o bot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'desconectado' && (
            <>
              <Button onClick={gerarQRCode} className="w-full">
                Gerar QR Code
              </Button>
              {qrCode && (
                <div className="flex flex-col items-center gap-4 p-6 border rounded-lg">
                  <div className="text-6xl">📱</div>
                  <p className="text-sm text-center text-muted-foreground">
                    Abra o WhatsApp no seu celular → Dispositivos conectados → Conectar dispositivo
                  </p>
                  <code className="text-xs bg-muted p-2 rounded">{qrCode}</code>
                </div>
              )}
            </>
          )}
          {status === 'conectado' && (
            <div className="flex flex-col items-center gap-4 p-6 border border-green-500 rounded-lg">
              <div className="text-6xl">✅</div>
              <p className="text-lg font-semibold">WhatsApp Conectado!</p>
              <p className="text-sm text-center text-muted-foreground">
                Seu bot está ativo e pronto para atender clientes
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações do Bot */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
          <CardDescription>
            Personalize o comportamento do bot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ativar/Desativar Bot */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="bot-ativo">Bot Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Ativar ou desativar o bot
              </p>
            </div>
            <Switch
              id="bot-ativo"
              checked={config.ativo}
              onCheckedChange={ativarBot}
            />
          </div>

          {/* Horário de Funcionamento */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horário de Funcionamento
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="horario-inicio" className="text-xs">
                  Início
                </Label>
                <Input
                  id="horario-inicio"
                  type="time"
                  value={config.horario_funcionamento?.inicio || '08:00'}
                  onChange={(e) =>
                    atualizarConfig('horario_funcionamento', {
                      ...config.horario_funcionamento,
                      inicio: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="horario-fim" className="text-xs">
                  Fim
                </Label>
                <Input
                  id="horario-fim"
                  type="time"
                  value={config.horario_funcionamento?.fim || '18:00'}
                  onChange={(e) =>
                    atualizarConfig('horario_funcionamento', {
                      ...config.horario_funcionamento,
                      fim: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Mensagem de Boas-Vindas */}
          <div className="space-y-2">
            <Label htmlFor="msg-boas-vindas">Mensagem de Boas-Vindas</Label>
            <Textarea
              id="msg-boas-vindas"
              value={config.mensagem_boas_vindas?.texto || ''}
              onChange={(e) =>
                atualizarConfig('mensagem_boas_vindas', {
                  texto: e.target.value,
                })
              }
              rows={3}
            />
          </div>

          {/* Mensagem de Ausência */}
          <div className="space-y-2">
            <Label htmlFor="msg-ausencia">Mensagem Fora do Horário</Label>
            <Textarea
              id="msg-ausencia"
              value={config.mensagem_ausencia?.texto || ''}
              onChange={(e) =>
                atualizarConfig('mensagem_ausencia', {
                  texto: e.target.value,
                })
              }
              rows={3}
            />
          </div>

          {/* Lembretes Automáticos */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="lembretes">Lembretes Automáticos</Label>
              <p className="text-sm text-muted-foreground">
                Enviar lembretes 24h antes dos agendamentos
              </p>
            </div>
            <Switch
              id="lembretes"
              checked={config.lembretes_ativos?.valor || false}
              onCheckedChange={(checked) =>
                atualizarConfig('lembretes_ativos', { valor: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">1. Conectar WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              Gere e escaneie o QR Code para conectar sua conta do WhatsApp Business
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">2. Ativar o Bot</h3>
            <p className="text-sm text-muted-foreground">
              Ative o bot nas configurações para que ele comece a responder mensagens
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">3. Personalizar Mensagens</h3>
            <p className="text-sm text-muted-foreground">
              Configure as mensagens automáticas e horários de funcionamento
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">4. Agendamentos Automáticos</h3>
            <p className="text-sm text-muted-foreground">
              O bot irá processar agendamentos, reagendamentos e cancelamentos automaticamente
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BotWhatsApp;
