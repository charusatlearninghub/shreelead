import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'user' | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

async function fetchRole(userId: string): Promise<'admin' | 'user'> {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    return (data?.role as 'admin' | 'user') ?? 'user';
  } catch {
    return 'user';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (!session?.user) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      setUser(session.user);
      const userRole = await fetchRole(session.user.id);
      if (mounted) {
        setRole(userRole);
        setLoading(false);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      if (error || !session?.user) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      setUser(session.user);
      const userRole = await fetchRole(session.user.id);
      if (mounted) {
        setRole(userRole);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    // Safety timeout - never spin forever
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
