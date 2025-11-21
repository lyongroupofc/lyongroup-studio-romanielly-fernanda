import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

export type UserRole = 'super_admin' | 'admin' | 'profissional';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isProfissional: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
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

    const initAuth = async () => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userRole = await fetchUserRole(session.user.id);
          if (isMounted) setRole(userRole);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userRole = await fetchUserRole(session.user.id);
          if (isMounted) setRole(userRole);
        } else {
          setRole(null);
        }

        if (isMounted) setLoading(false);
      }
    );

    initAuth();

    return () => {
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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signOut,
        isSuperAdmin: role === 'super_admin',
        isAdmin: role === 'admin',
        isProfissional: role === 'profissional',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
