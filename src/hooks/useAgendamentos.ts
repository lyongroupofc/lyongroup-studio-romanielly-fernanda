import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Agendamento = {
  id: string;
  data: string;
  horario: string;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_id: string | null;
  servico_id: string | null;
  servico_nome: string;
  profissional_id: string | null;
  profissional_nome: string | null;
  status: string;
  observacoes: string | null;
  origem: string | null;
  promocao_id?: string | null;
  desconto_aplicado?: number | null;
};

const CACHE_KEY = 'agendamentos_cache';
const CACHE_DURATION = 30 * 1000; // 30 segundos (reduzido de 10 minutos)

export const useAgendamentos = () => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }

    const fetchAgendamentos = async () => {
      hasFetchedRef.current = true;
      try {
        setLoading(true);
        
        // Verificar cache
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setAgendamentos(data);
            setLoading(false);
            return;
          }
        }
        
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 14);
        const dataLimiteStr = dataLimite.toISOString().split('T')[0];

        const { data, error } = await supabase
          .from("agendamentos")
          .select("id, data, horario, cliente_nome, cliente_telefone, cliente_id, servico_id, servico_nome, profissional_id, profissional_nome, status, observacoes, origem")
          .gte("data", dataLimiteStr)
          .order("data", { ascending: false })
          .order("horario", { ascending: true });

        if (error) {
          console.error("Erro ao carregar agendamentos:", error);
          setAgendamentos([]);
          return;
        }
        
        // Salvar no cache
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          data: data || [],
          timestamp: Date.now()
        }));
        
        setAgendamentos(data || []);
      } catch (error) {
        console.error("Erro ao carregar agendamentos:", error);
        setAgendamentos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAgendamentos();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      
      // Invalidar cache
      sessionStorage.removeItem(CACHE_KEY);
      
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 14);
      const dataLimiteStr = dataLimite.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, data, horario, cliente_nome, cliente_telefone, cliente_id, servico_id, servico_nome, profissional_id, profissional_nome, status, observacoes, origem")
        .gte("data", dataLimiteStr)
        .order("data", { ascending: false })
        .order("horario", { ascending: true });

      if (error) {
        console.error("Erro ao carregar agendamentos:", error);
        setAgendamentos([]);
        return;
      }
      
      // Salvar no cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: data || [],
        timestamp: Date.now()
      }));
      
      setAgendamentos(data || []);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const addAgendamento = async (agendamento: Omit<Agendamento, "id">) => {
    try {
      // Garantir formato HH:MM:SS para o horário
      const horarioComSegundos = agendamento.horario.length === 5 
        ? `${agendamento.horario}:00` 
        : agendamento.horario;
      
      console.log("[useAgendamentos] Criando agendamento:", {
        ...agendamento,
        horario: horarioComSegundos
      });
      
      const { data, error } = await supabase
        .from("agendamentos")
        .insert([{ 
          ...agendamento, 
          horario: horarioComSegundos,
          promocao_id: agendamento.promocao_id || null,
          desconto_aplicado: agendamento.desconto_aplicado || 0
        }])
        .select()
        .single();

      if (error) {
        console.error("Erro detalhado ao criar agendamento:", error);
        throw error;
      }
      
      console.log("[useAgendamentos] Agendamento criado com sucesso:", data);
      
      // Invalidar cache e forçar refetch
      sessionStorage.removeItem(CACHE_KEY);
      
      // Refetch para garantir que a lista está atualizada
      await refetch();
      
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
        toast.error(`Erro ao criar agendamento: ${error?.message || 'Desconhecido'}`);
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
      
      setAgendamentos(agendamentos.map(a => a.id === id ? data : a));
      
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
      
      setAgendamentos(agendamentos.map(a => a.id === id ? data : a));
      
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
      
      // Invalidar cache e forçar refetch
      sessionStorage.removeItem(CACHE_KEY);
      await refetch();
      
      toast.success("Agendamento removido!");
    } catch (error) {
      console.error("Erro ao deletar agendamento:", error);
      toast.error("Erro ao deletar agendamento");
      throw error;
    }
  };

  const getAgendamentosByData = (data: string) => {
    return agendamentos.filter((ag) => ag.data === data);
  };

  return {
    agendamentos,
    loading,
    addAgendamento,
    updateAgendamento,
    cancelAgendamento,
    deleteAgendamento,
    getAgendamentosByData,
    refetch,
  };
};
