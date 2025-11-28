import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FluxoAutomatico {
  id: string;
  tipo: string;
  mensagem_template: string;
  dias_apos_evento: number | null;
  ativo: boolean | null;
  hora_envio: string | null;
  created_at: string | null;
}

export interface MensagemAgendada {
  id: string;
  fluxo_id: string | null;
  cliente_id: string | null;
  data_envio: string;
  status: string | null;
  created_at: string | null;
}

export const useFluxosAutomaticos = () => {
  const [fluxos, setFluxos] = useState<FluxoAutomatico[]>([]);
  const [mensagens, setMensagens] = useState<MensagemAgendada[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const { toast } = useToast();

  const fetchFluxos = async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    try {
      const { data, error } = await supabase
        .from('fluxos_automaticos')
        .select('*')
        .order('tipo', { ascending: true });

      if (error) throw error;
      setFluxos(data || []);
    } catch (error) {
      console.error('Erro ao buscar fluxos:', error);
      toast({
        title: 'Erro ao carregar fluxos',
        description: 'Não foi possível carregar os fluxos automáticos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMensagens = async () => {
    try {
      const { data, error } = await supabase
        .from('mensagens_agendadas')
        .select('*')
        .order('data_envio', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMensagens(data || []);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const refetch = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fluxos_automaticos')
        .select('*')
        .order('tipo', { ascending: true });

      if (error) throw error;
      setFluxos(data || []);
      await fetchMensagens();
    } catch (error) {
      console.error('Erro ao buscar fluxos:', error);
      toast({
        title: 'Erro ao carregar fluxos',
        description: 'Não foi possível carregar os fluxos automáticos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const adicionarFluxo = async (fluxoData: Omit<FluxoAutomatico, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase.from('fluxos_automaticos').insert(fluxoData);

      if (error) throw error;

      toast({
        title: 'Fluxo criado',
        description: 'O fluxo automático foi criado com sucesso.',
      });

      await refetch();
    } catch (error) {
      console.error('Erro ao adicionar fluxo:', error);
      toast({
        title: 'Erro ao criar fluxo',
        description: 'Não foi possível criar o fluxo automático.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const atualizarFluxo = async (id: string, fluxoData: Partial<FluxoAutomatico>) => {
    try {
      const { error } = await supabase
        .from('fluxos_automaticos')
        .update(fluxoData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Fluxo atualizado',
        description: 'O fluxo automático foi atualizado com sucesso.',
      });

      await refetch();
    } catch (error) {
      console.error('Erro ao atualizar fluxo:', error);
      toast({
        title: 'Erro ao atualizar fluxo',
        description: 'Não foi possível atualizar o fluxo automático.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deletarFluxo = async (id: string) => {
    try {
      const { error } = await supabase.from('fluxos_automaticos').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Fluxo excluído',
        description: 'O fluxo automático foi excluído com sucesso.',
      });

      await refetch();
    } catch (error) {
      console.error('Erro ao deletar fluxo:', error);
      toast({
        title: 'Erro ao excluir fluxo',
        description: 'Não foi possível excluir o fluxo automático.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchFluxos();
    fetchMensagens();

    return () => {
      hasFetchedRef.current = false;
    };
  }, []);

  return {
    fluxos,
    mensagens,
    loading,
    refetch,
    adicionarFluxo,
    atualizarFluxo,
    deletarFluxo,
  };
};
