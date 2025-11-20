import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Cache para otimizar performance (2 minutos - dados mudam frequentemente)
const CACHE_KEY = 'agendamentos_cache';
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

export type Agendamento = {
  id: string;
  data: string;
  horario: string;
  cliente_nome: string;
  cliente_telefone: string;
  servico_id: string | null;
  servico_nome: string;
  profissional_id: string | null;
  profissional_nome: string | null;
  status: string;
  observacoes: string | null;
};

export const useAgendamentos = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgendamentos = async (forceRefresh = false) => {
    try {
      // Tentar usar cache primeiro
      if (!forceRefresh) {
        const cached = getCachedData();
        if (cached) {
          setAgendamentos(cached);
          setLoading(false);
          return;
        }
      }

      // Buscar apenas agendamentos dos últimos 30 dias para melhor performance
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);
      const dataLimiteStr = dataLimite.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .gte("data", dataLimiteStr)
        .order("data", { ascending: false })
        .order("horario", { ascending: true })
        .limit(200);

      if (error) throw error;
      
      const agendamentosData = data || [];
      setAgendamentos(agendamentosData);
      setCachedData(agendamentosData);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendamentos();

    const channel = supabase
      .channel('agendamentos_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agendamentos' },
        (payload) => {
          const rec: any = (payload as any).new ?? (payload as any).old;
          if ((payload as any).eventType === 'INSERT' && (payload as any).new) {
            setAgendamentos((prev) => [...prev, (payload as any).new as Agendamento]);
          } else if ((payload as any).eventType === 'UPDATE' && (payload as any).new) {
            setAgendamentos((prev) => prev.map((a) => a.id === rec.id ? (payload as any).new as Agendamento : a));
          } else if ((payload as any).eventType === 'DELETE' && (payload as any).old) {
            setAgendamentos((prev) => prev.filter((a) => a.id !== rec.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addAgendamento = async (agendamento: Omit<Agendamento, "id">) => {
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .insert([agendamento])
        .select()
        .single();

      if (error) throw error;
      
      const novosAgendamentos = [...agendamentos, data];
      setAgendamentos(novosAgendamentos);
      setCachedData(novosAgendamentos); // Atualizar cache
      
      toast.success("Agendamento criado com sucesso!", {
        position: "top-center",
        duration: 3000,
      });
      return data;
    } catch (error: any) {
      console.error("Erro ao criar agendamento:", error);
      if (error?.code === "23505") {
        toast.error("Já existe um agendamento para este horário");
      } else {
        toast.error("Erro ao criar agendamento");
      }
      throw error;
    }
  };

  const updateAgendamento = async (id: string, updates: Partial<Agendamento>) => {
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      const agendamentosAtualizados = agendamentos.map(a => a.id === id ? data : a);
      setAgendamentos(agendamentosAtualizados);
      setCachedData(agendamentosAtualizados); // Atualizar cache
      
      toast.success("Agendamento atualizado!");
      return data;
    } catch (error) {
      console.error("Erro ao atualizar agendamento:", error);
      toast.error("Erro ao atualizar agendamento");
      throw error;
    }
  };

  const cancelAgendamento = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .update({ status: "Cancelado" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      const agendamentosAtualizados = agendamentos.map(a => a.id === id ? data : a);
      setAgendamentos(agendamentosAtualizados);
      setCachedData(agendamentosAtualizados); // Atualizar cache
      
      toast.success("Agendamento cancelado!");
      return data;
    } catch (error) {
      console.error("Erro ao cancelar agendamento:", error);
      toast.error("Erro ao cancelar agendamento");
      throw error;
    }
  };

  const deleteAgendamento = async (id: string) => {
    try {
      const { error } = await supabase
        .from("agendamentos")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      const agendamentosFiltrados = agendamentos.filter(a => a.id !== id);
      setAgendamentos(agendamentosFiltrados);
      setCachedData(agendamentosFiltrados); // Atualizar cache
      
      toast.success("Agendamento removido!");
    } catch (error) {
      console.error("Erro ao remover agendamento:", error);
      toast.error("Erro ao remover agendamento");
      throw error;
    }
  };

  const getAgendamentosByData = (data: string) => {
    return agendamentos.filter(a => a.data === data);
  };

  return {
    agendamentos,
    loading,
    addAgendamento,
    updateAgendamento,
    deleteAgendamento,
    cancelAgendamento,
    getAgendamentosByData,
    refetch: fetchAgendamentos
  };
};
