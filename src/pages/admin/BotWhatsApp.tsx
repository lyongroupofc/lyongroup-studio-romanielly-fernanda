import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBotWhatsApp } from "@/hooks/useBotWhatsApp";
import { useBotConversas } from "@/hooks/useBotConversas";
import { useNumerosBloqueados } from "@/hooks/useNumerosBloqueados";
import { MessageCircle, TrendingUp, Calendar, RefreshCw, Phone, MessageSquare, Ban, Plus, X, Eraser, FileText, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    toggleBotConversa,
    clearContext,
    clearMessages,
  } = useBotConversas();

  const {
    numeros,
    loading: loadingNumeros,
    addNumero,
    removeNumero,
  } = useNumerosBloqueados();

  const [openBloquearNumero, setOpenBloquearNumero] = useState(false);
  const [openInformacoes, setOpenInformacoes] = useState(false);
  const [authenticatedInfo, setAuthenticatedInfo] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [informacoesAdicionais, setInformacoesAdicionais] = useState("");

  useEffect(() => {
    if (openInformacoes && authenticatedInfo) {
      fetchInformacoes();
    }
  }, [openInformacoes, authenticatedInfo]);

  const fetchInformacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_config')
        .select('valor')
        .eq('chave', 'informacoes_adicionais')
        .maybeSingle();

      if (error) throw error;
      const valorData = data?.valor as { texto?: string } | null;
      setInformacoesAdicionais(valorData?.texto || "");
    } catch (error) {
      console.error('Erro ao buscar informações:', error);
    }
  };

  const handlePasswordSubmitInfo = () => {
    if (passwordInput === "RF9646") {
      setAuthenticatedInfo(true);
      setPasswordInput("");
      toast.success("Acesso liberado!");
    } else {
      toast.error("Senha incorreta!");
      setPasswordInput("");
    }
  };

  const handleSaveInformacoes = async () => {
    try {
      const { error } = await supabase
        .from('bot_config')
        .upsert({
          chave: 'informacoes_adicionais',
          valor: { texto: informacoesAdicionais }
        }, { onConflict: 'chave' });

      if (error) throw error;
      toast.success("Informações salvas com sucesso!");
      setOpenInformacoes(false);
      setAuthenticatedInfo(false);
    } catch (error) {
      console.error('Erro ao salvar informações:', error);
      toast.error("Erro ao salvar informações");
    }
  };

  const handleBloquearNumero = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    await addNumero(
      formData.get("numero") as string,
      formData.get("motivo") as string || undefined
    );
    
    setOpenBloquearNumero(false);
    form.reset();
  };

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
        <div className="flex gap-2">
          <Button onClick={() => setOpenInformacoes(true)} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Adicionar Informação
          </Button>
          <Button onClick={refetch} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
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

      {/* Números Bloqueados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Números Bloqueados
              </CardTitle>
              <CardDescription>
                O bot não responderá números bloqueados (ex: números do próprio salão)
              </CardDescription>
            </div>
            <Dialog open={openBloquearNumero} onOpenChange={setOpenBloquearNumero}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Bloquear Número
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bloquear Número</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBloquearNumero} className="space-y-4">
                  <div>
                    <Label htmlFor="numero">Número (com DDD)</Label>
                    <Input 
                      id="numero" 
                      name="numero" 
                      placeholder="5531999999999" 
                      required 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Digite apenas números com DDD (ex: 5531999999999)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="motivo">Motivo (opcional)</Label>
                    <Textarea 
                      id="motivo" 
                      name="motivo" 
                      placeholder="Ex: Número do salão"
                      rows={2}
                    />
                  </div>
                  <Button type="submit" className="w-full">Bloquear</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingNumeros ? (
            <Skeleton className="h-20 w-full" />
          ) : numeros.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Ban className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum número bloqueado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {numeros.map((numero) => (
                <div
                  key={numero.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{numero.numero.replace('@s.whatsapp.net', '')}</p>
                    {numero.motivo && (
                      <p className="text-sm text-muted-foreground">{numero.motivo}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNumero(numero.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversas */}
      <Card className="bg-[#e5ddd5]">
        <CardHeader className="bg-[#008069] text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversas Recentes
          </CardTitle>
          <CardDescription className="text-white/80">
            Acompanhe as conversas do bot em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {loadingConversas ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : conversas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-white rounded-lg">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma conversa ainda</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Lista de Conversas */}
              <ScrollArea className="h-[500px] pr-4 bg-white rounded-lg p-2">
                <div className="space-y-2">
                  {conversas.map((conversa) => (
                    <div
                      key={conversa.id}
                      className={`w-full rounded-lg border transition-colors ${
                        conversaSelecionada === conversa.id
                          ? 'bg-[#f0f2f5] border-[#008069]'
                          : 'hover:bg-[#f0f2f5]'
                      }`}
                    >
                      <button
                        onClick={() => selecionarConversa(conversa.id)}
                        className="w-full text-left p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-[#25d366] p-2 rounded-full">
                            <Phone className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {conversa.cliente_nome || conversa.contexto?.cliente_nome || conversa.telefone.replace('@s.whatsapp.net','').replace('@lid','')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conversa.ultimo_contato), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                      <div className="px-4 pb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`bot-${conversa.id}`}
                            checked={conversa.bot_ativo}
                            onCheckedChange={(checked) => toggleBotConversa(conversa.id, checked)}
                          />
                          <Label htmlFor={`bot-${conversa.id}`} className="text-xs text-muted-foreground cursor-pointer">
                            {conversa.bot_ativo ? 'Bot ativo' : 'Bot desativado'}
                          </Label>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearContext(conversa.id);
                            }}
                            title="Limpar memória"
                            className="h-8"
                          >
                            <Eraser className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearMessages(conversa.id);
                            }}
                            title="Limpar histórico de mensagens"
                            className="h-8"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Mensagens */}
              <div className="border rounded-lg bg-[#0b141a] overflow-hidden shadow-lg">
                {conversaSelecionada ? (
                  <>
                    <div className="bg-[#202c33] p-3 text-white flex items-center gap-3 shadow-md">
                      <Phone className="h-5 w-5" />
                      <span className="font-medium">
                        {conversas.find(c => c.id === conversaSelecionada)?.cliente_nome || 
                         conversas.find(c => c.id === conversaSelecionada)?.contexto?.cliente_nome || 
                         conversas.find(c => c.id === conversaSelecionada)?.telefone.replace('@s.whatsapp.net', '').replace('@lid', '')}
                      </span>
                    </div>
                    <ScrollArea className="h-[452px] p-4 bg-[#0b141a]">
                      <div className="space-y-3">
                        {mensagens[conversaSelecionada]?.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.tipo === 'enviada' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 shadow-md ${
                                msg.tipo === 'enviada'
                                  ? 'bg-[#005c4b] text-white'
                                  : 'bg-[#202c33] text-white'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                              <p className={`text-xs mt-1 ${msg.tipo === 'enviada' ? 'text-[#8696a0]' : 'text-[#8696a0]'}`}>
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
                  </>
                ) : (
                  <div className="h-[500px] flex items-center justify-center bg-[#0b141a]">
                    <div className="text-center text-[#8696a0]">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-70" />
                      <p>Selecione uma conversa</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Informações Adicionais */}
      <Dialog open={openInformacoes} onOpenChange={(open) => {
        setOpenInformacoes(open);
        if (!open) {
          setAuthenticatedInfo(false);
          setPasswordInput("");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Informações Adicionais para o Bot</DialogTitle>
          </DialogHeader>
          {!authenticatedInfo ? (
            <div className="text-center space-y-6 py-8">
              <Lock className="w-16 h-16 mx-auto text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Área Protegida</h3>
                <p className="text-muted-foreground mt-2">
                  Insira a senha para gerenciar as informações do bot
                </p>
              </div>
              <div className="space-y-4 max-w-sm mx-auto">
                <Input
                  type="password"
                  placeholder="Digite a senha"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handlePasswordSubmitInfo();
                  }}
                />
                <Button onClick={handlePasswordSubmitInfo} className="w-full">
                  Acessar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Adicione informações importantes que o bot deve saber, como horários especiais, 
                promoções, novos serviços ou qualquer informação adicional relevante.
              </p>
              <Textarea
                value={informacoesAdicionais}
                onChange={(e) => setInformacoesAdicionais(e.target.value)}
                placeholder="Ex: Promoção de Natal: 20% de desconto em todos os serviços de unhas até 31/12"
                rows={10}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setOpenInformacoes(false);
                  setAuthenticatedInfo(false);
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveInformacoes}>
                  Salvar Informações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BotWhatsApp;
