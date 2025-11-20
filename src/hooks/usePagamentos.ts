import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    const fetchPagamentos = async () => {
      if (isFetchingRef.current || !mountedRef.current) return;
      isFetchingRef.current = true;
      
      try {
        setLoading(true);
        
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 30);
        const dataLimiteStr = dataLimite.toISOString().split('T')[0];

        const { data, error } = await supabase
          .from("pagamentos")
          .select("id, agendamento_id, cliente_nome, servico, valor, metodo_pagamento, status, data, created_at")
          .gte("data", dataLimiteStr)
          .order("data", { ascending: false })
          .limit(200);

        if (error) {
          console.error("Erro ao buscar pagamentos:", error);
          if (mountedRef.current) setPagamentos([]);
          return;
        }
        
        if (mountedRef.current) setPagamentos(data || []);
      } catch (error) {
        console.error("Erro ao buscar pagamentos:", error);
        if (mountedRef.current) setPagamentos([]);
      } finally {
        if (mountedRef.current) setLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchPagamentos();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      setLoading(true);
      
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);
      const dataLimiteStr = dataLimite.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("pagamentos")
        .select("id, agendamento_id, cliente_nome, servico, valor, metodo_pagamento, status, data, created_at")
        .gte("data", dataLimiteStr)
        .order("data", { ascending: false })
        .limit(200);

      if (error) {
        console.error("Erro ao buscar pagamentos:", error);
        setPagamentos([]);
        return;
      }
      
      setPagamentos(data || []);
    } catch (error) {
      console.error("Erro ao buscar pagamentos:", error);
      setPagamentos([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const addPagamento = async (pagamento: Omit<Pagamento, "id" | "created_at">) => {
    try {
      const { data, error } = await supabase
        .from("pagamentos")
        .insert([pagamento])
        .select()
        .single();

      if (error) throw error;

      setPagamentos([data, ...pagamentos]);
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

      setPagamentos(pagamentos.map((pag) => (pag.id === id ? data : pag)));
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

      setPagamentos(pagamentos.filter((pag) => pag.id !== id));
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
    refetch,
  };
};
