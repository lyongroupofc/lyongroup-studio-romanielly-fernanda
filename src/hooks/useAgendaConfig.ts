import { useState, useEffect } from "react";
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

const CACHE_KEY = 'agenda_config_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const useAgendaConfig = () => {
  const [configs, setConfigs] = useState<Record<string, AgendaConfig>>({});
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async (forceRefresh = false) => {
    try {
      // Tentar carregar do cache primeiro
      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < CACHE_DURATION) {
            setConfigs(data);
            setLoading(false);
            return;
          }
        }
      }

      const { data, error } = await supabase
        .from("agenda_config")
        .select("*");

      if (error) throw error;
      
      const configMap: Record<string, AgendaConfig> = {};
      data?.forEach(config => {
        configMap[config.data] = config;
      });
      
      // Salvar no cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: configMap,
        timestamp: Date.now()
      }));
      
      setConfigs(configMap);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações da agenda");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const getConfig = (data: string): AgendaConfig | null => {
    return configs[data] || null;
  };

  const updateConfig = async (data: string, updates: Partial<Omit<AgendaConfig, "id" | "data">>) => {
    try {
      const existing = configs[data];
      
      // Limpar cache ao atualizar
      localStorage.removeItem(CACHE_KEY);
      
      if (existing) {
        const { data: updated, error } = await supabase
          .from("agenda_config")
          .update(updates)
          .eq("data", data)
          .select()
          .single();

        if (error) throw error;
        
        const newConfigs = { ...configs, [data]: updated };
        setConfigs(newConfigs);
        
        // Atualizar cache imediatamente
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: newConfigs,
          timestamp: Date.now()
        }));
        
        return updated;
      } else {
        const { data: created, error } = await supabase
          .from("agenda_config")
          .insert([{ data, ...updates }])
          .select()
          .single();

        if (error) throw error;
        
        const newConfigs = { ...configs, [data]: created };
        setConfigs(newConfigs);
        
        // Atualizar cache imediatamente
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: newConfigs,
          timestamp: Date.now()
        }));
        
        return created;
      }
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error);
      toast.error("Erro ao atualizar configuração");
      throw error;
    }
  };

  return { configs, loading, getConfig, updateConfig, refetch: fetchConfigs };
};
