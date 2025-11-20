import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const fetchAgendamentos = async () => {
    try {
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
      setAgendamentos(data || []);
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
      setAgendamentos([...agendamentos, data]);
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
      setAgendamentos(agendamentos.map(a => a.id === id ? data : a));
      toast.success("Agendamento atualizado!");
      return data;
    } catch (error) {
      console.error("Erro ao atualizar agendamento:", error);
      toast.error("Erro ao atualizar agendamento");
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
      setAgendamentos(agendamentos.filter(a => a.id !== id));
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
    getAgendamentosByData,
    refetch: fetchAgendamentos
  };
};
