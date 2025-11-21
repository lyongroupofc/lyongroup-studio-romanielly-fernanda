import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

export type UserRole = 'super_admin' | 'admin' | 'profissional';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[useAuth] useEffect executado');
    let isMounted = true;
    let isInitialized = false;
    
    // Função para buscar role do usuário
    const fetchUserRole = async (userId: string) => {
      try {
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();
        
        if (error) {
          console.error('Erro ao buscar role:', error);
          return null;
        }
        
        return roleData?.role as UserRole || null;
      } catch (error) {
        console.error('Erro ao buscar role:', error);
        return null;
      }
    };

    // Verificar sessão existente uma única vez
    const initAuth = async () => {
      if (isInitialized) {
        console.log('[useAuth] Bloqueado - já inicializado');
        return;
      }
      console.log('[useAuth] Inicializando autenticação...');
      isInitialized = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userRole = await fetchUserRole(session.user.id);
          if (isMounted) {
            setRole(userRole);
          }
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Configurar listener de auth (apenas para mudanças futuras)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userRole = await fetchUserRole(session.user.id);
          if (isMounted) {
            setRole(userRole);
          }
        } else {
          setRole(null);
        }

        if (isMounted) {
          setLoading(false);
        }
      }
    );

    // Inicializar
    initAuth();

    return () => {
      console.log('[useAuth] Cleanup executado');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return {
    user,
    session,
    role,
    loading,
    signOut,
    isSuperAdmin: role === 'super_admin',
    isAdmin: role === 'admin',
    isProfissional: role === 'profissional',
  };
};