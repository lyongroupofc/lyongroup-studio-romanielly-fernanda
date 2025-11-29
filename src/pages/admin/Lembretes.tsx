import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Bell, Clock, Send, Heart, Gift, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFluxosAutomaticos } from "@/hooks/useFluxosAutomaticos";

type LembreteEnviado = {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
  servico_nome: string | null;
  data_envio: string;
  tipo_lembrete: string;
  created_at: string;
};

const Avisos = () => {
  const [loading, setLoading] = useState(true);
  const [lembretes, setLembretes] = useState<LembreteEnviado[]>([]);
  const [lembretesAtivos, setLembretesAtivos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const hasFetchedRef = useRef(false);
  const { fluxos, mensagens } = useFluxosAutomaticos();

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const initPage = async () => {
      await fetchConfig();
      await fetchLembretes();
    };

    initPage();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("bot_config")
        .select("*")
        .eq("chave", "lembretes_ativos")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      setLembretesAtivos(data?.valor as boolean || false);
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
    }
  };

  const fetchLembretes = async () => {
    try {
      const { data, error } = await supabase
        .from("lembretes_enviados")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLembretes(data || []);
    } catch (error) {
      console.error("Erro ao carregar lembretes:", error);
      toast.error("Erro ao carregar lembretes");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLembretes = async (ativo: boolean) => {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("bot_config")
        .upsert({
          chave: "lembretes_ativos",
          valor: ativo,
        }, {
          onConflict: "chave"
        });

      if (error) throw error;

      setLembretesAtivos(ativo);
      toast.success(ativo ? "Lembretes automáticos ativados" : "Lembretes automáticos desativados");
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error);
      toast.error("Erro ao atualizar configuração");
    } finally {
      setSalvando(false);
    }
  };

  const handleTestarLembrete = async () => {
    const loadingToast = toast.loading("Enviando lembrete de teste...");
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-reminders-fixed");

      if (error) throw error;

      toast.dismiss(loadingToast);
      toast.success(`Lembretes processados! ${data?.enviados || 0} enviados.`);
      await fetchLembretes();
    } catch (error) {
      console.error("Erro ao testar lembrete:", error);
      toast.dismiss(loadingToast);
      toast.error("Erro ao enviar lembrete de teste");
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'pos_primeira_visita':
        return <Sparkles className="w-5 h-5 text-blue-500" />;
      case 'reativacao':
        return <Heart className="w-5 h-5 text-pink-500" />;
      case 'aniversario':
        return <Gift className="w-5 h-5 text-purple-500" />;
      case 'natal':
      case 'dia_mulher':
      case 'dia_maes':
      case 'dia_pais':
        return <CalendarIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'pos_primeira_visita': 'Pós Primeira Visita',
      'reativacao': 'Reativação',
      'manutencao': 'Manutenção',
      'aniversario': 'Aniversário',
      'natal': 'Natal',
      'dia_mulher': 'Dia da Mulher',
      'dia_maes': 'Dia das Mães',
      'dia_pais': 'Dia dos Pais',
    };
    return labels[tipo] || tipo;
  };

  // Agrupar mensagens por tipo de fluxo
  const mensagensPorTipo = fluxos.reduce((acc, fluxo) => {
    const mensagensDoFluxo = mensagens.filter(m => m.fluxo_id === fluxo.id);
    acc[fluxo.tipo] = {
      fluxo,
      mensagens: mensagensDoFluxo,
      enviadas: mensagensDoFluxo.filter(m => m.status === 'enviado').length,
      pendentes: mensagensDoFluxo.filter(m => m.status === 'pendente').length,
    };
    return acc;
  }, {} as Record<string, any>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Avisos e Notificações
        </h1>
        <p className="text-muted-foreground">
          Gerencie lembretes automáticos e mensagens dos fluxos
        </p>
      </div>

      {/* Card de Lembretes de Horários */}
      <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-500" />
              <div>
                <CardTitle>Lembretes de Horários Agendados</CardTitle>
                <CardDescription>
                  Enviados 1 dia antes, às 10h da manhã
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="lembretes-ativos"
                  checked={lembretesAtivos}
                  onCheckedChange={handleToggleLembretes}
                  disabled={salvando}
                />
                <Label htmlFor="lembretes-ativos" className="cursor-pointer">
                  {lembretesAtivos ? "Ativo" : "Inativo"}
                </Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestarLembrete}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Testar Envio
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {lembretes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum lembrete enviado ainda
              </p>
            ) : (
              lembretes.map((lembrete) => (
                <Card key={lembrete.id} className="border-blue-500/20 bg-blue-500/5">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{lembrete.cliente_nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {lembrete.servico_nome || "Serviço não especificado"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lembrete.cliente_telefone}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{format(parseISO(lembrete.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                        <p>{format(parseISO(lembrete.created_at), "HH:mm", { locale: ptBR })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards de Fluxos Automáticos */}
      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(mensagensPorTipo).map(([tipo, data]) => (
          <Card key={tipo} className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                {getTipoIcon(tipo)}
                <div>
                  <CardTitle className="text-lg">{getTipoLabel(tipo)}</CardTitle>
                  <CardDescription>
                    {data.fluxo.ativo ? "Ativo" : "Inativo"} • {data.enviadas} enviadas • {data.pendentes} pendentes
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {data.mensagens.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    Nenhuma mensagem agendada
                  </p>
                ) : (
                  data.mensagens.slice(0, 5).map((mensagem: any) => (
                    <div
                      key={mensagem.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {format(new Date(mensagem.data_envio), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className={`text-xs font-medium ${
                        mensagem.status === 'enviado' ? 'text-green-600' :
                        mensagem.status === 'erro' ? 'text-red-600' :
                        'text-amber-600'
                      }`}>
                        {mensagem.status === 'enviado' ? 'Enviado' :
                         mensagem.status === 'erro' ? 'Erro' : 'Pendente'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Informações sobre os avisos */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Como Funcionam os Avisos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Lembretes de Horários:</strong> Enviados automaticamente 1 dia antes do agendamento, às 10h da manhã.
          </p>
          <p>
            <strong>Fluxos Automáticos:</strong> Mensagens configuradas no Lyon Flow são enviadas automaticamente nos horários e datas definidos.
          </p>
          <p>
            <strong>Status das Mensagens:</strong> Você pode acompanhar se cada mensagem foi enviada com sucesso, está pendente ou teve erro no envio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Avisos;
