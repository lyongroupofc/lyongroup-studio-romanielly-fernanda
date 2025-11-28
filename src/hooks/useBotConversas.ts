import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type BotConversa = {
  id: string;
  telefone: string;
  contexto: any;
  ultimo_contato: string;
  created_at: string;
  bot_ativo: boolean;
  cliente_nome?: string;
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
  const hasFetchedRef = useRef(false);

  const fetchConversas = async () => {
    try {
      const { data: conversasData, error } = await supabase
        .from('bot_conversas')
        .select('*')
        .order('ultimo_contato', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Buscar nomes dos clientes baseado no telefone (se ainda não tiver no banco)
      const conversasComNomes = await Promise.all(
        (conversasData || []).map(async (conversa) => {
          // Se já tem nome no banco, usar ele
          if (conversa.cliente_nome) {
            return conversa;
          }
          
          // Caso contrário, buscar na tabela clientes
          const telefone = conversa.telefone.replace('@lid', '').replace('@s.whatsapp.net', '').replace(/\D/g, '');
          const { data: cliente } = await supabase
            .from('clientes')
            .select('nome')
            .eq('telefone', telefone)
            .maybeSingle();
          
          return {
            ...conversa,
            cliente_nome: cliente?.nome
          };
        })
      );
      
      setConversas(conversasComNomes);
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
    // Prevent multiple executions on reload
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

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

  const clearMessages = async (conversaId: string) => {
    try {
      const { error } = await supabase
        .from('bot_mensagens')
        .delete()
        .eq('conversa_id', conversaId);

      if (error) throw error;
      
      // Atualizar localmente
      setMensagens(prev => ({
        ...prev,
        [conversaId]: []
      }));
      
      toast.success("Histórico de mensagens limpo!");
    } catch (error) {
      console.error('Erro ao limpar mensagens:', error);
      toast.error("Erro ao limpar histórico de mensagens");
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
    clearMessages,
    refetch: fetchConversas,
  };
};
