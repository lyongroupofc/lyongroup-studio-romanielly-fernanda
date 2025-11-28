import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  quantidade_atual: number | null;
  quantidade_minima: number | null;
  preco_custo: number | null;
  preco_venda: number | null;
  categoria: string | null;
  fornecedor: string | null;
  created_at: string | null;
}

export interface MovimentacaoEstoque {
  id: string;
  produto_id: string | null;
  tipo: string;
  quantidade: number;
  motivo: string | null;
  created_at: string | null;
}

export const useProdutos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const { toast } = useToast();

  const fetchProdutos = async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: 'Erro ao carregar produtos',
        description: 'Não foi possível carregar a lista de produtos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMovimentacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('movimentacoes_estoque')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovimentacoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
    }
  };

  const refetch = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setProdutos(data || []);
      await fetchMovimentacoes();
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: 'Erro ao carregar produtos',
        description: 'Não foi possível carregar a lista de produtos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const adicionarProduto = async (produtoData: Omit<Produto, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase.from('produtos').insert(produtoData);

      if (error) throw error;

      toast({
        title: 'Produto adicionado',
        description: 'O produto foi adicionado com sucesso.',
      });

      await refetch();
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      toast({
        title: 'Erro ao adicionar produto',
        description: 'Não foi possível adicionar o produto.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const atualizarProduto = async (id: string, produtoData: Partial<Produto>) => {
    try {
      const { error } = await supabase
        .from('produtos')
        .update(produtoData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Produto atualizado',
        description: 'O produto foi atualizado com sucesso.',
      });

      await refetch();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast({
        title: 'Erro ao atualizar produto',
        description: 'Não foi possível atualizar o produto.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const registrarMovimentacao = async (
    produtoId: string,
    tipo: 'entrada' | 'saida',
    quantidade: number,
    motivo: string
  ) => {
    try {
      const produto = produtos.find((p) => p.id === produtoId);
      if (!produto) throw new Error('Produto não encontrado');

      const novaQuantidade =
        tipo === 'entrada'
          ? (produto.quantidade_atual || 0) + quantidade
          : (produto.quantidade_atual || 0) - quantidade;

      if (novaQuantidade < 0) {
        throw new Error('Quantidade insuficiente em estoque');
      }

      const { error: movError } = await supabase.from('movimentacoes_estoque').insert({
        produto_id: produtoId,
        tipo,
        quantidade,
        motivo,
      });

      if (movError) throw movError;

      const { error: updateError } = await supabase
        .from('produtos')
        .update({ quantidade_atual: novaQuantidade })
        .eq('id', produtoId);

      if (updateError) throw updateError;

      toast({
        title: 'Movimentação registrada',
        description: `${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso.`,
      });

      await refetch();
    } catch (error: any) {
      console.error('Erro ao registrar movimentação:', error);
      toast({
        title: 'Erro ao registrar movimentação',
        description: error.message || 'Não foi possível registrar a movimentação.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deletarProduto = async (id: string) => {
    try {
      const { error } = await supabase.from('produtos').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Produto excluído',
        description: 'O produto foi excluído com sucesso.',
      });

      await refetch();
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      toast({
        title: 'Erro ao excluir produto',
        description: 'Não foi possível excluir o produto.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchProdutos();
    fetchMovimentacoes();

    return () => {
      hasFetchedRef.current = false;
    };
  }, []);

  return {
    produtos,
    movimentacoes,
    loading,
    refetch,
    adicionarProduto,
    atualizarProduto,
    registrarMovimentacao,
    deletarProduto,
  };
};
