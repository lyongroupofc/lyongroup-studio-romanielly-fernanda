import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Cache para otimizar performance (2 minutos - dados mudam frequentemente)
const CACHE_KEY = 'pagamentos_cache';
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

const getCachedData = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (e) {
    console.error('Erro ao ler cache:', e);
  }
  return null;
};

const setCachedData = (data: any) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Erro ao salvar cache:', e);
  }
};

export type Pagamento = {
  id: string;
  agendamento_id: string | null;
  cliente_nome: string;
  servico: string;
  valor: number;
  metodo_pagamento: string | null;
  status: string;
  data: string;
  created_at?: string;
};

export const usePagamentos = () => {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPagamentos = async (forceRefresh = false) => {
    try {
      // Tentar usar cache primeiro
      if (!forceRefresh) {
        const cached = getCachedData();
        if (cached) {
          setPagamentos(cached);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      // Buscar apenas pagamentos dos últimos 30 dias para melhor performance
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);
      const dataLimiteStr = dataLimite.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("pagamentos")
        .select("*")
        .gte("data", dataLimiteStr)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      
      const pagamentosData = data || [];
      setPagamentos(pagamentosData);
      setCachedData(pagamentosData);
    } catch (error) {
      console.error("Erro ao buscar pagamentos:", error);
      toast.error("Erro ao carregar pagamentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPagamentos();
  }, []);

  const addPagamento = async (pagamento: Omit<Pagamento, "id" | "created_at">) => {
    try {
      const { data, error } = await supabase
        .from("pagamentos")
        .insert([pagamento])
        .select()
        .single();

      if (error) throw error;

      setPagamentos((prev) => {
        const novosPagamentos = [data, ...prev];
        setCachedData(novosPagamentos); // Atualizar cache
        return novosPagamentos;
      });
      toast.success("Pagamento registrado com sucesso!");
      return data;
    } catch (error) {
      console.error("Erro ao adicionar pagamento:", error);
      toast.error("Erro ao registrar pagamento");
      throw error;
    }
  };

  const updatePagamento = async (id: string, updates: Partial<Pagamento>) => {
    try {
      const { data, error } = await supabase
        .from("pagamentos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setPagamentos((prev) => {
        const pagamentosAtualizados = prev.map((pag) => (pag.id === id ? data : pag));
        setCachedData(pagamentosAtualizados); // Atualizar cache
        return pagamentosAtualizados;
      });
      toast.success("Pagamento atualizado!");
      return data;
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
      toast.error("Erro ao atualizar pagamento");
      throw error;
    }
  };

  const deletePagamento = async (id: string) => {
    try {
      const { error } = await supabase
        .from("pagamentos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPagamentos((prev) => {
        const pagamentosFiltrados = prev.filter((pag) => pag.id !== id);
        setCachedData(pagamentosFiltrados); // Atualizar cache
        return pagamentosFiltrados;
      });
      toast.success("Pagamento removido!");
    } catch (error) {
      console.error("Erro ao deletar pagamento:", error);
      toast.error("Erro ao remover pagamento");
    }
  };

  return {
    pagamentos,
    loading,
    addPagamento,
    updatePagamento,
    deletePagamento,
    refetch: fetchPagamentos,
  };
};
