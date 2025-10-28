import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useBotWhatsApp = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'conectado' | 'desconectado' | 'erro'>('desconectado');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [config, setConfig] = useState({
    ativo: false,
    horario_funcionamento: { inicio: '08:00', fim: '18:00' },
    mensagem_boas_vindas: { texto: 'Olá! Bem-vindo ao nosso salão.' },
    mensagem_ausencia: { texto: 'Fora do horário de atendimento.' },
    lembretes_ativos: { valor: true },
  });
  const [estatisticas, setEstatisticas] = useState({
    conversas_hoje: 0,
    agendamentos_bot: 0,
    mensagens_hoje: 0,
  });

  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-auth', {
        body: {},
        method: 'GET',
      });

      if (error) throw error;
      setStatus(data?.status || 'desconectado');
      setQrCode(data?.sessao?.qr_code || null);
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      setStatus('erro');
    }
  };

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_config')
        .select('*');

      if (error) throw error;

      const configObj: any = {};
      data?.forEach(item => {
        configObj[item.chave] = item.valor;
      });

      setConfig(configObj);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    }
  };

  const fetchEstatisticas = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Conversas hoje
      const { count: conversas } = await supabase
        .from('bot_conversas')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', hoje);

      // Agendamentos pelo bot
      const { count: agendamentos } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('origem', 'whatsapp');

      // Mensagens hoje
      const { count: mensagens } = await supabase
        .from('bot_mensagens')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', hoje);

      setEstatisticas({
        conversas_hoje: conversas || 0,
        agendamentos_bot: agendamentos || 0,
        mensagens_hoje: mensagens || 0,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchStatus(), fetchConfig(), fetchEstatisticas()]);
      setLoading(false);
    };
    init();

    // Atualizar status a cada 10 segundos
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const gerarQRCode = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('whatsapp-auth', {
        body: {},
        method: 'GET',
      });

      if (error) throw error;
      
      setQrCode(data?.qr_code);
      toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
      await fetchStatus();
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error('Erro ao gerar QR Code');
    } finally {
      setLoading(false);
    }
  };

  const ativarBot = async (ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('bot_config')
        .update({ valor: { valor: ativo } })
        .eq('chave', 'ativo');

      if (error) throw error;
      
      setConfig(prev => ({ ...prev, ativo }));
      toast.success(ativo ? 'Bot ativado!' : 'Bot desativado');
    } catch (error) {
      console.error('Erro ao atualizar bot:', error);
      toast.error('Erro ao atualizar status do bot');
    }
  };

  const atualizarConfig = async (chave: string, valor: any) => {
    try {
      const { error } = await supabase
        .from('bot_config')
        .update({ valor, updated_at: new Date().toISOString() })
        .eq('chave', chave);

      if (error) throw error;
      
      setConfig(prev => ({ ...prev, [chave]: valor }));
      toast.success('Configuração atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  return {
    loading,
    status,
    qrCode,
    config,
    estatisticas,
    gerarQRCode,
    ativarBot,
    atualizarConfig,
    refetch: () => {
      fetchStatus();
      fetchConfig();
      fetchEstatisticas();
    },
  };
};
