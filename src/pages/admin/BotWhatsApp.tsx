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
import { MessageCircle, TrendingUp, Calendar, RefreshCw, Phone, MessageSquare, Ban, Plus, X, Eraser, FileText, Lock, QrCode, Wifi, WifiOff, Loader2, Power } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useMemo, useCallback } from "react";
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
  const [filtroConversa, setFiltroConversa] = useState("");
  
  // Estados para Evolution API QR Code
  const [evolutionStatus, setEvolutionStatus] = useState<'conectado' | 'desconectado' | 'conectando' | 'erro'>('desconectado');
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Função para verificar status da Evolution API
  const checkEvolutionStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('evolution-qrcode', {
        body: {},
      });

      // Adicionar query param via URL não funciona com invoke, então precisamos usar outro método
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-qrcode?action=status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

      const statusData = await response.json();
      console.log('📊 Status Evolution:', statusData);

      if (statusData.status === 'conectado') {
        setEvolutionStatus('conectado');
        setQrCodeBase64(null);
      } else if (statusData.state === 'connecting') {
        setEvolutionStatus('conectando');
      } else {
        setEvolutionStatus('desconectado');
      }
    } catch (error) {
      console.error('Erro ao verificar status Evolution:', error);
      setEvolutionStatus('erro');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Função para gerar QR Code
  const generateQRCode = async () => {
    setLoadingQR(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-qrcode?action=qrcode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

      const data = await response.json();
      console.log('📱 QR Code Response:', data);

      if (data.qrcode) {
        setQrCodeBase64(data.qrcode);
        setEvolutionStatus('conectando');
        toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
      } else if (data.error) {
        toast.error(`Erro: ${data.error}`);
      } else {
        toast.info('Verifique se já está conectado');
        checkEvolutionStatus();
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error('Erro ao gerar QR Code');
    } finally {
      setLoadingQR(false);
    }
  };

  // Função para desconectar
  const disconnectEvolution = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-qrcode?action=disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setEvolutionStatus('desconectado');
        setQrCodeBase64(null);
        toast.success('WhatsApp desconectado');
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast.error('Erro ao desconectar');
    }
  };

  // Verificar status ao carregar e periodicamente
  useEffect(() => {
    checkEvolutionStatus();
    const interval = setInterval(checkEvolutionStatus, 15000); // A cada 15 segundos
    return () => clearInterval(interval);
  }, [checkEvolutionStatus]);

  const conversasFiltradas = useMemo(() => {
    if (!filtroConversa.trim()) return conversas;

    const normalizar = (valor: string) =>
      valor
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "");

    const termoNumero = filtroConversa.replace(/\D/g, "");
    const termoTexto = normalizar(filtroConversa);

    return conversas.filter((conversa) => {
      const nomeBase =
        conversa.cliente_nome ||
        conversa.contexto?.cliente_nome ||
        "";

      const telefoneLimpo = (conversa.telefone || "")
        .replace("@s.whatsapp.net", "")
        .replace("@lid", "")
        .replace(/\D/g, "");

      const nomeNormalizado = normalizar(nomeBase);

      const matchNome = termoTexto && nomeNormalizado.includes(termoTexto);
      const matchTelefone =
        termoNumero && telefoneLimpo.includes(termoNumero);

      return matchNome || matchTelefone;
    });
  }, [conversas, filtroConversa]);

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
    <div className="container mx-auto p-4 sm:p-6 space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Bot WhatsApp</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configure e gerencie o assistente virtual
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenInformacoes(true)} variant="outline" size="sm" className="sm:size-default">
            <FileText className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Adicionar Informação</span>
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

      {/* Evolution API - QR Code WhatsApp */}
      <Card className="border-2 border-[#25d366]">
        <CardHeader className="bg-gradient-to-r from-[#25d366] to-[#128c7e] text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Conexão WhatsApp - Evolution API
              </CardTitle>
              <CardDescription className="text-white/80">
                Conecte seu WhatsApp escaneando o QR Code
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {evolutionStatus === 'conectado' && (
                <Badge className="bg-white text-[#25d366]">
                  <Wifi className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              )}
              {evolutionStatus === 'desconectado' && (
                <Badge variant="destructive">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Desconectado
                </Badge>
              )}
              {evolutionStatus === 'conectando' && (
                <Badge className="bg-yellow-500">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Conectando...
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loadingStatus ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#25d366]" />
            </div>
          ) : evolutionStatus === 'conectado' ? (
            <div className="text-center py-8 space-y-4">
              <div className="bg-[#25d366]/10 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                <Wifi className="h-12 w-12 text-[#25d366]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#25d366]">WhatsApp Conectado!</h3>
                <p className="text-muted-foreground mt-1">
                  Seu bot está pronto para receber mensagens
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={disconnectEvolution}
                className="mt-4"
              >
                <Power className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {qrCodeBase64 ? (
                <div className="text-center space-y-4">
                  <div className="bg-white p-4 rounded-lg inline-block shadow-lg border">
                    <img 
                      src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                      alt="QR Code WhatsApp"
                      className="w-64 h-64 mx-auto"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Abra o WhatsApp no seu celular → Menu (⋮) → Aparelhos conectados → Conectar
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      O QR Code expira em 60 segundos. Clique em "Atualizar QR Code" se necessário.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button onClick={generateQRCode} disabled={loadingQR} variant="outline">
                      {loadingQR ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Atualizar QR Code
                    </Button>
                    <Button onClick={checkEvolutionStatus} variant="ghost">
                      Verificar Conexão
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="bg-muted p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                    <QrCode className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Conectar WhatsApp</h3>
                    <p className="text-muted-foreground mt-1">
                      Clique no botão abaixo para gerar o QR Code de conexão
                    </p>
                  </div>
                  <Button 
                    onClick={generateQRCode} 
                    disabled={loadingQR}
                    className="bg-[#25d366] hover:bg-[#128c7e]"
                    size="lg"
                  >
                    {loadingQR ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <QrCode className="h-4 w-4 mr-2" />
                    )}
                    Gerar QR Code
                  </Button>
                </div>
              )}
            </div>
          )}
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
          <div className="mb-3">
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={filtroConversa}
              onChange={(e) => setFiltroConversa(e.target.value)}
              className="bg-white"
            />
          </div>
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
          ) : conversasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-white rounded-lg">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma conversa encontrada para esse filtro</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lista de Conversas */}
              <ScrollArea className="h-[500px] pr-4 bg-white rounded-lg p-2">
                <div className="space-y-2">
                  {conversasFiltradas.map((conversa) => (
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
