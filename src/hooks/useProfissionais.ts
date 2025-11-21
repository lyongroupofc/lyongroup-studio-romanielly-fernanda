import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Profissional = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  especialidades: string[] | null;
  ativo: boolean;
};

const CACHE_KEY = 'profissionais_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

export const useProfissionais = () => {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    // Prevenir execução duplicada
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    const fetchProfissionais = async () => {
      try {
        setLoading(true);
        
        // Verificar cache
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setProfissionais(data);
            setLoading(false);
            return;
          }
        }
        
        const { data, error } = await supabase
          .from("profissionais")
          .select("*")
          .eq("ativo", true)
          .order("nome");

        if (error) throw error;
        
        // Salvar no cache
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data: data || [],
          timestamp: Date.now()
        }));
        
        setProfissionais(data || []);
      } catch (error) {
        console.error("Erro ao carregar profissionais:", error);
        toast.error("Erro ao carregar profissionais");
      } finally {
        setLoading(false);
      }
    };

    fetchProfissionais();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      
      // Invalidar cache
      sessionStorage.removeItem(CACHE_KEY);
      
      const { data, error } = await supabase
        .from("profissionais")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      
      // Salvar no cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: data || [],
        timestamp: Date.now()
      }));
      
      setProfissionais(data || []);
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
      toast.error("Erro ao carregar profissionais");
    } finally {
      setLoading(false);
    }
  };

  const addProfissional = async (profissional: Omit<Profissional, "id" | "ativo">) => {
    try {
      const { data, error } = await supabase
        .from("profissionais")
        .insert([profissional])
        .select()
        .single();

      if (error) throw error;
      
      setProfissionais([...profissionais, data]);
      toast.success("Profissional adicionado com sucesso!");
      return data;
    } catch (error) {
      console.error("Erro ao adicionar profissional:", error);
      toast.error("Erro ao adicionar profissional");
      throw error;
    }
  };

  const updateProfissional = async (id: string, updates: Partial<Profissional>) => {
    try {
      const { data, error } = await supabase
        .from("profissionais")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      setProfissionais(profissionais.map(p => p.id === id ? data : p));
      toast.success("Profissional atualizado com sucesso!");
      return data;
    } catch (error) {
      console.error("Erro ao atualizar profissional:", error);
      toast.error("Erro ao atualizar profissional");
      throw error;
    }
  };

  const deleteProfissional = async (id: string) => {
    try {
      const { error } = await supabase
        .from("profissionais")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
      
      setProfissionais(profissionais.filter(p => p.id !== id));
      toast.success("Profissional removido com sucesso!");
    } catch (error) {
      console.error("Erro ao remover profissional:", error);
      toast.error("Erro ao remover profissional");
      throw error;
    }
  };

  return { profissionais, loading, addProfissional, updateProfissional, deleteProfissional, refetch };
};
