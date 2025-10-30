import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type BotConversa = {
  id: string;
  telefone: string;
  contexto: any;
  ultimo_contato: string;
  created_at: string;
  bot_ativo: boolean;
};

export type BotMensagem = {
  id: string;
  conversa_id: string;
  telefone: string;
  tipo: 'recebida' | 'enviada';
  conteudo: string;
  timestamp: string;
};

export const useBotConversas = () => {
  const [conversas, setConversas] = useState<BotConversa[]>([]);
  const [mensagens, setMensagens] = useState<Record<string, BotMensagem[]>>({});
  const [loading, setLoading] = useState(true);
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);

  const fetchConversas = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_conversas')
        .select('*')
        .order('ultimo_contato', { ascending: false })
        .limit(50);

      if (error) throw error;
      setConversas(data || []);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMensagens = async (conversaId: string) => {
    try {
      const { data, error } = await supabase
        .from('bot_mensagens')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      
      setMensagens(prev => ({
        ...prev,
        [conversaId]: (data || []) as BotMensagem[]
      }));
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  useEffect(() => {
    fetchConversas();

    // Realtime para novas conversas
    const conversasChannel = supabase
      .channel('bot_conversas_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bot_conversas'
        },
        () => {
          fetchConversas();
        }
      )
      .subscribe();

    // Realtime para novas mensagens
    const mensagensChannel = supabase
      .channel('bot_mensagens_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bot_mensagens'
        },
        (payload) => {
          const novaMensagem = payload.new as BotMensagem;
          if (conversaSelecionada === novaMensagem.conversa_id) {
            fetchMensagens(novaMensagem.conversa_id);
          }
          fetchConversas(); // Atualizar último contato
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversasChannel);
      supabase.removeChannel(mensagensChannel);
    };
  }, [conversaSelecionada]);

  const selecionarConversa = (conversaId: string) => {
    setConversaSelecionada(conversaId);
    if (!mensagens[conversaId]) {
      fetchMensagens(conversaId);
    }
  };

  const toggleBotConversa = async (conversaId: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('bot_conversas')
        .update({ bot_ativo: ativo })
        .eq('id', conversaId);

      if (error) throw error;
      
      // Atualizar localmente
      setConversas(prev => 
        prev.map(c => c.id === conversaId ? { ...c, bot_ativo: ativo } : c)
      );
    } catch (error) {
      console.error('Erro ao atualizar bot_ativo:', error);
      throw error;
    }
  };

  const clearContext = async (conversaId: string) => {
    try {
      const { error } = await supabase
        .from('bot_conversas')
        .update({ contexto: {} })
        .eq('id', conversaId);

      if (error) throw error;
      
      // Atualizar localmente
      setConversas(prev => 
        prev.map(c => c.id === conversaId ? { ...c, contexto: {} } : c)
      );
      
      toast.success("Memória da conversa limpa!");
    } catch (error) {
      console.error('Erro ao limpar contexto:', error);
      toast.error("Erro ao limpar memória da conversa");
      throw error;
    }
  };

  return {
    conversas,
    mensagens,
    loading,
    conversaSelecionada,
    selecionarConversa,
    toggleBotConversa,
    clearContext,
    refetch: fetchConversas,
  };
};
