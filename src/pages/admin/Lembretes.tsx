import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Bell, Clock, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type LembreteEnviado = {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
  servico_nome: string | null;
  data_envio: string;
  tipo_lembrete: string;
  created_at: string;
};

const Lembretes = () => {
  const [loading, setLoading] = useState(true);
  const [lembretes, setLembretes] = useState<LembreteEnviado[]>([]);
  const [lembretesAtivos, setLembretesAtivos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple executions on reload
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
    setSalvando(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-reminders");

      if (error) throw error;

      toast.success(`Teste concluído! ${data?.remindersCount || 0} lembretes enviados`);
      await fetchLembretes();
    } catch (error) {
      console.error("Erro ao testar lembretes:", error);
      toast.error("Erro ao testar envio de lembretes");
    } finally {
      setSalvando(false);
    }
  };

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
        <h1 className="text-3xl font-bold">Lembretes Automáticos</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os lembretes enviados automaticamente aos clientes
        </p>
      </div>

      {/* Card de Configuração */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="lembretes-ativos" className="text-base font-semibold">
                Lembretes Automáticos
              </Label>
              <p className="text-sm text-muted-foreground">
                Envia lembretes automáticos 1 dia antes do agendamento
              </p>
            </div>
            <Switch
              id="lembretes-ativos"
              checked={lembretesAtivos}
              onCheckedChange={handleToggleLembretes}
              disabled={salvando}
            />
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={handleTestarLembrete}
              disabled={salvando || !lembretesAtivos}
              variant="outline"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Testar Envio de Lembretes
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Envia lembretes para todos os agendamentos de amanhã
            </p>
          </div>
        </div>
      </Card>

      {/* Lista de Lembretes Enviados */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Histórico de Lembretes</h2>
        {lembretes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum lembrete enviado ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lembretes.map((lembrete) => (
              <Card key={lembrete.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-success" />
                      <span className="font-semibold">{lembrete.cliente_nome}</span>
                      <span className="text-sm text-muted-foreground">
                        {lembrete.cliente_telefone}
                      </span>
                    </div>
                    {lembrete.servico_nome && (
                      <p className="text-sm text-muted-foreground">
                        Serviço: {lembrete.servico_nome}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(lembrete.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                        {lembrete.tipo_lembrete}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Informações */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-2">Como funciona?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>
              Lembretes são enviados automaticamente 1 dia antes do agendamento
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>
              Apenas agendamentos com status "Confirmado" recebem lembretes
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>
              O sistema verifica diariamente às 10h da manhã
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>
              Você pode testar o envio a qualquer momento usando o botão acima
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default Lembretes;
