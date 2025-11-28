import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Promocao {
  id: string;
  nome: string;
  descricao: string | null;
  motivo: string | null;
  desconto_porcentagem: number | null;
  desconto_valor: number | null;
  data_inicio: string;
  data_fim: string;
  ativa: boolean | null;
  created_at: string | null;
}

export const usePromocoes = () => {
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const { toast } = useToast();

  const fetchPromocoes = async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    try {
      const { data, error } = await supabase
        .from('promocoes')
        .select('*')
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      setPromocoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar promoções:', error);
      toast({
        title: 'Erro ao carregar promoções',
        description: 'Não foi possível carregar a lista de promoções.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promocoes')
        .select('*')
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      setPromocoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar promoções:', error);
      toast({
        title: 'Erro ao carregar promoções',
        description: 'Não foi possível carregar a lista de promoções.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const adicionarPromocao = async (promocaoData: Omit<Promocao, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase.from('promocoes').insert(promocaoData);

      if (error) throw error;

      toast({
        title: 'Promoção criada',
        description: 'A promoção foi criada com sucesso.',
      });

      await refetch();
    } catch (error) {
      console.error('Erro ao adicionar promoção:', error);
      toast({
        title: 'Erro ao criar promoção',
        description: 'Não foi possível criar a promoção.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const atualizarPromocao = async (id: string, promocaoData: Partial<Promocao>) => {
    try {
      const { error } = await supabase
        .from('promocoes')
        .update(promocaoData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Promoção atualizada',
        description: 'A promoção foi atualizada com sucesso.',
      });

      await refetch();
    } catch (error) {
      console.error('Erro ao atualizar promoção:', error);
      toast({
        title: 'Erro ao atualizar promoção',
        description: 'Não foi possível atualizar a promoção.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deletarPromocao = async (id: string) => {
    try {
      const { error } = await supabase.from('promocoes').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Promoção excluída',
        description: 'A promoção foi excluída com sucesso.',
      });

      await refetch();
    } catch (error) {
      console.error('Erro ao deletar promoção:', error);
      toast({
        title: 'Erro ao excluir promoção',
        description: 'Não foi possível excluir a promoção.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchPromocoes();

    return () => {
      hasFetchedRef.current = false;
    };
  }, []);

  return {
    promocoes,
    loading,
    refetch,
    adicionarPromocao,
    atualizarPromocao,
    deletarPromocao,
  };
};
