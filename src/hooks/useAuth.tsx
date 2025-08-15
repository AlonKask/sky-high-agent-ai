import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authSecurity } from "@/utils/authSecurity";
import { configSecurity } from "@/utils/configSecurity";
import { enhancedSessionSecurity } from "@/utils/enhancedSessionSecurity";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize secure configuration and auth monitoring
    const initSecurity = async () => {
      try {
        await configSecurity.initializeSecureConfig();
        authSecurity.initializeSessionMonitoring();
      } catch (error) {
        // Silent fail for security initialization
      }
    };

    initSecurity();

    // Set up auth state listener with enhanced security
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Initialize enhanced session security on sign in
        if (event === 'SIGNED_IN' && session) {
          setTimeout(() => {
            enhancedSessionSecurity.initializeSecureSession();
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          enhancedSessionSecurity.cleanup();
        }
      }
    );

    // Get initial session with security validation
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Validate existing session security
      if (session && !enhancedSessionSecurity.validateSession()) {
        enhancedSessionSecurity.secureSignOut();
      }
    });

    return () => {
      subscription.unsubscribe();
      authSecurity.destroy();
      enhancedSessionSecurity.cleanup();
    };
  }, []);

  const signOut = async () => {
    try {
      enhancedSessionSecurity.secureSignOut();
    } catch (error) {
      // Use enhanced security signout on error
      enhancedSessionSecurity.secureSignOut();
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};