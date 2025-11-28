import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  categoria?: string;
  data: string;
  metodo_pagamento?: string;
  comprovante_url?: string;
  created_at?: string;
}

export const useDespesas = () => {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  const fetchDespesas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .order('data', { ascending: false });

      if (error) throw error;
      setDespesas(data || []);
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
      toast.error('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchDespesas();

    return () => {
      hasFetchedRef.current = false;
    };
  }, []);

  const addDespesa = async (despesa: Omit<Despesa, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('despesas')
        .insert(despesa);

      if (error) throw error;

      toast.success('Despesa registrada com sucesso!');
      await fetchDespesas();
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      toast.error('Erro ao registrar despesa');
    }
  };

  const deleteDespesa = async (id: string) => {
    try {
      const { error } = await supabase
        .from('despesas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Despesa excluída com sucesso!');
      await fetchDespesas();
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      toast.error('Erro ao excluir despesa');
    }
  };

  const refetch = fetchDespesas;

  return { despesas, loading, addDespesa, deleteDespesa, refetch };
};
