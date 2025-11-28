import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  data_nascimento: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export const useClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);
  const { toast } = useToast();

  const fetchClientes = async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast({
        title: 'Erro ao carregar clientes',
        description: 'Não foi possível carregar a lista de clientes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast({
        title: 'Erro ao carregar clientes',
        description: 'Não foi possível carregar a lista de clientes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const buscarAniversariantesMes = async (mes: number) => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .not('data_nascimento', 'is', null)
        .order('data_nascimento', { ascending: true });

      if (error) throw error;

      // Filtrar clientes cujo mês de nascimento é igual ao mês especificado
      const aniversariantes = (data || []).filter((cliente) => {
        if (!cliente.data_nascimento) return false;
        const dataNasc = new Date(cliente.data_nascimento + 'T00:00:00');
        return dataNasc.getMonth() === mes;
      });

      return aniversariantes;
    } catch (error) {
      console.error('Erro ao buscar aniversariantes:', error);
      toast({
        title: 'Erro ao buscar aniversariantes',
        description: 'Não foi possível carregar os aniversariantes do mês.',
        variant: 'destructive',
      });
      return [];
    }
  };

  const buscarAniversariantesPorDia = async (data: string) => {
    try {
      // Buscar todos clientes com data de nascimento
      const { data: todos, error } = await supabase
        .from('clientes')
        .select('*')
        .not('data_nascimento', 'is', null);
        
      if (error) throw error;
      
      // Extrair dia do parâmetro de data
      const [ano, mes, dia] = data.split('-');
      const diaInt = parseInt(dia, 10);
      const mesInt = parseInt(mes, 10) - 1; // JavaScript usa 0-11 para meses
      
      // Filtrar clientes que fazem aniversário neste dia e mês
      return (todos || []).filter(cliente => {
        const nascimento = new Date(cliente.data_nascimento + 'T00:00:00');
        return nascimento.getDate() === diaInt && nascimento.getMonth() === mesInt;
      });
    } catch (error) {
      console.error('Erro ao buscar aniversariantes do dia:', error);
      return [];
    }
  };

  const criarOuAtualizarCliente = async (clienteData: {
    nome: string;
    telefone: string;
    data_nascimento?: string;
    email?: string;
  }) => {
    try {
      // Verificar se cliente já existe pelo telefone
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', clienteData.telefone)
        .maybeSingle();

      if (clienteExistente) {
        // Atualizar cliente existente
        const { data, error } = await supabase
          .from('clientes')
          .update({
            nome: clienteData.nome,
            data_nascimento: clienteData.data_nascimento || clienteExistente.data_nascimento,
            email: clienteData.email || clienteExistente.email,
          })
          .eq('id', clienteExistente.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Criar novo cliente
        const { data, error } = await supabase
          .from('clientes')
          .insert({
            nome: clienteData.nome,
            telefone: clienteData.telefone,
            data_nascimento: clienteData.data_nascimento || null,
            email: clienteData.email || null,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar cliente:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchClientes();

    return () => {
      hasFetchedRef.current = false;
    };
  }, []);

  return {
    clientes,
    loading,
    buscarAniversariantesMes,
    buscarAniversariantesPorDia,
    criarOuAtualizarCliente,
    refetch,
  };
};
