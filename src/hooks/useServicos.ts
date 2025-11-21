import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  duracao: number;
  preco: number;
  ativo: boolean;
};

const CACHE_KEY = 'servicos_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

export const useServicos = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (isFetchingRef.current) return;
    
    const fetchServicos = async () => {
      isFetchingRef.current = true;
      try {
        setLoading(true);
        
        // Verificar cache
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setServicos(data);
            setLoading(false);
            return;
          }
        }
        
        const { data, error } = await supabase
          .from("servicos")
          .select("*")
          .eq("ativo", true)
          .order("nome");

        if (error) throw error;
        
        // Salvar no cache
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data: data || [],
          timestamp: Date.now()
        }));
        
        setServicos(data || []);
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
        toast.error("Erro ao carregar serviços");
      } finally {
        setLoading(false);
      }
    };

    fetchServicos();

    return () => {
      isFetchingRef.current = false;
    };
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      
      // Invalidar cache
      sessionStorage.removeItem(CACHE_KEY);
      
      const { data, error } = await supabase
        .from("servicos")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      
      // Salvar no cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: data || [],
        timestamp: Date.now()
      }));
      
      setServicos(data || []);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      toast.error("Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  };

  const addServico = async (servico: Omit<Servico, "id" | "ativo">) => {
    try {
      const { data, error } = await supabase
        .from("servicos")
        .insert([servico])
        .select()
        .single();

      if (error) throw error;
      
      setServicos([...servicos, data]);
      toast.success("Serviço adicionado com sucesso!");
      return data;
    } catch (error) {
      console.error("Erro ao adicionar serviço:", error);
      toast.error("Erro ao adicionar serviço");
      throw error;
    }
  };

  const updateServico = async (id: string, updates: Partial<Servico>) => {
    try {
      const { data, error } = await supabase
        .from("servicos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      setServicos(servicos.map(s => s.id === id ? data : s));
      toast.success("Serviço atualizado com sucesso!");
      return data;
    } catch (error) {
      console.error("Erro ao atualizar serviço:", error);
      toast.error("Erro ao atualizar serviço");
      throw error;
    }
  };

  const deleteServico = async (id: string) => {
    try {
      const { error } = await supabase
        .from("servicos")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
      
      setServicos(servicos.filter(s => s.id !== id));
      toast.success("Serviço removido com sucesso!");
    } catch (error) {
      console.error("Erro ao remover serviço:", error);
      toast.error("Erro ao remover serviço");
      throw error;
    }
  };

  return { servicos, loading, addServico, updateServico, deleteServico, refetch };
};
