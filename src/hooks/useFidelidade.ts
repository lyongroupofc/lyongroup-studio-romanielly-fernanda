import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClienteFidelidade {
  id: string;
  cliente_id: string;
  pontos_acumulados: number | null;
  nivel: string | null;
  total_gasto: number | null;
  total_servicos: number | null;
  ultimo_servico: string | null;
  created_at: string | null;
}

export interface RegrasFidelidade {
  id: string;
  pontos_por_real: number | null;
  pontos_resgate: number | null;
  desconto_resgate: number | null;
  created_at: string | null;
}

export const useFidelidade = () => {
  const [fidelidades, setFidelidades] = useState<ClienteFidelidade[]>([]);
  const [regras, setRegras] = useState<RegrasFidelidade | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const { toast } = useToast();

  const fetchFidelidades = async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    try {
      const { data, error } = await supabase
        .from('cliente_fidelidade')
        .select('*')
        .order('pontos_acumulados', { ascending: false });

      if (error) throw error;
      setFidelidades(data || []);
    } catch (error) {
      console.error('Erro ao buscar fidelidades:', error);
      toast({
        title: 'Erro ao carregar fidelidades',
        description: 'Não foi possível carregar os dados de fidelidade.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRegras = async () => {
    try {
      const { data, error } = await supabase
        .from('regras_fidelidade')
        .select('*')
        .single();

      if (error) throw error;
      setRegras(data);
    } catch (error) {
      console.error('Erro ao buscar regras de fidelidade:', error);
    }
  };

  const refetch = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cliente_fidelidade')
        .select('*')
        .order('pontos_acumulados', { ascending: false });

      if (error) throw error;
      setFidelidades(data || []);
      await fetchRegras();
    } catch (error) {
      console.error('Erro ao buscar fidelidades:', error);
      toast({
        title: 'Erro ao carregar fidelidades',
        description: 'Não foi possível carregar os dados de fidelidade.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const atualizarRegras = async (regrasData: Partial<RegrasFidelidade>) => {
    try {
      if (!regras) throw new Error('Regras não carregadas');

      const { error } = await supabase
        .from('regras_fidelidade')
        .update(regrasData)
        .eq('id', regras.id);

      if (error) throw error;

      toast({
        title: 'Regras atualizadas',
        description: 'As regras de fidelidade foram atualizadas com sucesso.',
      });

      await fetchRegras();
    } catch (error) {
      console.error('Erro ao atualizar regras:', error);
      toast({
        title: 'Erro ao atualizar regras',
        description: 'Não foi possível atualizar as regras.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const resgatarPontos = async (clienteId: string, pontosResgatados: number) => {
    try {
      const fidelidade = fidelidades.find((f) => f.cliente_id === clienteId);
      if (!fidelidade) throw new Error('Fidelidade não encontrada');

      if ((fidelidade.pontos_acumulados || 0) < pontosResgatados) {
        throw new Error('Pontos insuficientes');
      }

      const novosPontos = (fidelidade.pontos_acumulados || 0) - pontosResgatados;

      const { error } = await supabase
        .from('cliente_fidelidade')
        .update({ pontos_acumulados: novosPontos })
        .eq('cliente_id', clienteId);

      if (error) throw error;

      toast({
        title: 'Pontos resgatados',
        description: `${pontosResgatados} pontos foram resgatados com sucesso.`,
      });

      await refetch();
    } catch (error: any) {
      console.error('Erro ao resgatar pontos:', error);
      toast({
        title: 'Erro ao resgatar pontos',
        description: error.message || 'Não foi possível resgatar os pontos.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchFidelidades();
    fetchRegras();

    return () => {
      hasFetchedRef.current = false;
    };
  }, []);

  return {
    fidelidades,
    regras,
    loading,
    refetch,
    atualizarRegras,
    resgatarPontos,
  };
};
