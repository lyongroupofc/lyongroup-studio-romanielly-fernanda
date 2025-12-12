import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AgendaConfig = {
  id: string;
  data: string;
  fechado: boolean;
  horarios_bloqueados: string[];
  horarios_extras: string[];
  observacoes: string | null;
};

export const useAgendaConfig = () => {
  const [configs, setConfigs] = useState<Record<string, AgendaConfig>>({});
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    const fetchConfigs = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("agenda_config")
          .select("id, data, fechado, horarios_bloqueados, horarios_extras, observacoes");

        if (error) {
          console.error("Erro ao carregar configurações:", error);
          setConfigs({});
          return;
        }
        
        const configMap: Record<string, AgendaConfig> = {};
        data?.forEach(config => {
          configMap[config.data] = {
            ...config,
            horarios_bloqueados: config.horarios_bloqueados || [],
            horarios_extras: config.horarios_extras || []
          };
        });
        
        setConfigs(configMap);
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        setConfigs({});
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("agenda_config")
        .select("id, data, fechado, horarios_bloqueados, horarios_extras, observacoes");

      if (error) {
        console.error("Erro ao carregar configurações:", error);
        setConfigs({});
        return;
      }
      
      const configMap: Record<string, AgendaConfig> = {};
      data?.forEach(config => {
        configMap[config.data] = {
          ...config,
          horarios_bloqueados: config.horarios_bloqueados || [],
          horarios_extras: config.horarios_extras || []
        };
      });
      
      setConfigs(configMap);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      setConfigs({});
    } finally {
      setLoading(false);
    }
  };

  const getConfig = (data: string): AgendaConfig | null => {
    return configs[data] || null;
  };

  const updateConfig = async (dataStr: string, updates: Partial<Omit<AgendaConfig, "id" | "data">>) => {
    try {
      const existing = configs[dataStr];
      
      if (existing) {
        const { data: updated, error } = await supabase
          .from("agenda_config")
          .update(updates)
          .eq("data", dataStr)
          .select()
          .single();

        if (error) throw error;
        
        // Atualizar state local imediatamente
        const newConfig = {
          ...updated,
          horarios_bloqueados: updated.horarios_bloqueados || [],
          horarios_extras: updated.horarios_extras || []
        };
        setConfigs(prev => ({ ...prev, [dataStr]: newConfig }));
        return updated;
      } else {
        const { data: created, error } = await supabase
          .from("agenda_config")
          .insert([{ data: dataStr, ...updates }])
          .select()
          .single();

        if (error) throw error;
        
        // Atualizar state local imediatamente
        const newConfig = {
          ...created,
          horarios_bloqueados: created.horarios_bloqueados || [],
          horarios_extras: created.horarios_extras || []
        };
        setConfigs(prev => ({ ...prev, [dataStr]: newConfig }));
        return created;
      }
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error);
      toast.error("Erro ao atualizar configuração");
      throw error;
    }
  };

  return { configs, loading, getConfig, updateConfig, refetch };
};
