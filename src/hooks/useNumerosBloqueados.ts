import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type NumeroBloqueado = {
  id: string;
  numero: string;
  motivo: string | null;
  created_at: string;
};

export const useNumerosBloqueados = () => {
  const [numeros, setNumeros] = useState<NumeroBloqueado[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  const fetchNumeros = async () => {
    try {
      const { data, error } = await supabase
        .from("bot_numeros_bloqueados")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNumeros(data || []);
    } catch (error) {
      console.error("Erro ao carregar números bloqueados:", error);
      toast.error("Erro ao carregar números bloqueados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prevent multiple executions on reload
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    fetchNumeros();
  }, []);

  const addNumero = async (numero: string, motivo?: string) => {
    try {
      // Formatar número para incluir @s.whatsapp.net se não tiver
      const numeroFormatado = numero.includes("@") ? numero : `${numero}@s.whatsapp.net`;
      
      const { error } = await supabase
        .from("bot_numeros_bloqueados")
        .insert([{ numero: numeroFormatado, motivo }]);

      if (error) throw error;
      toast.success("Número bloqueado com sucesso");
      await fetchNumeros();
    } catch (error: any) {
      console.error("Erro ao bloquear número:", error);
      if (error.code === "23505") {
        toast.error("Este número já está bloqueado");
      } else {
        toast.error("Erro ao bloquear número");
      }
    }
  };

  const removeNumero = async (id: string) => {
    try {
      const { error } = await supabase
        .from("bot_numeros_bloqueados")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Número desbloqueado com sucesso");
      await fetchNumeros();
    } catch (error) {
      console.error("Erro ao desbloquear número:", error);
      toast.error("Erro ao desbloquear número");
    }
  };

  return {
    numeros,
    loading,
    addNumero,
    removeNumero,
    refetch: fetchNumeros,
  };
};
