import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthCleanup } from "@/utils/authCleanup";
import { SimpleAuth } from "@/utils/simpleAuth";

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
  const [sessionHealthy, setSessionHealthy] = useState<boolean>(true);

  useEffect(() => {
    console.log('🔄 Initializing simplified auth system...');

    // Set up auth state listener (SIMPLIFIED - no complex security)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔐 Auth state change: ${event}`, { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          userId: session?.user?.id 
        });

        // Update state synchronously
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Validate session health on sign in
        if (event === 'SIGNED_IN' && session) {
          setTimeout(async () => {
            try {
              const health = await AuthCleanup.validateSessionHealth();
              setSessionHealthy(health.isHealthy);
              
              if (!health.isHealthy) {
                console.warn('⚠️ Session health check failed after sign-in:', health);
                
                // Attempt recovery once
                const recovered = await AuthCleanup.attemptSessionRecovery();
                if (recovered) {
                  console.log('✅ Session recovery successful');
                  setSessionHealthy(true);
                } else {
                  console.error('❌ Session recovery failed - forcing re-auth');
                  await SimpleAuth.signOut();
                }
              } else {
                console.log('✅ Session health validated successfully');
              }
            } catch (error) {
              console.error('❌ Session health check failed:', error);
              setSessionHealthy(false);
            }
          }, 100);
        } else if (event === 'SIGNED_OUT') {
          setSessionHealthy(true); // Reset health state
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Initial session check failed:', error);
        setLoading(false);
        return;
      }

      console.log('🔍 Initial session check:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id 
      });

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Validate existing session health
      if (session) {
        try {
          const health = await AuthCleanup.validateSessionHealth();
          setSessionHealthy(health.isHealthy);
          
          if (!health.isHealthy) {
            console.warn('⚠️ Existing session health check failed:', health);
            
            // Attempt recovery
            const recovered = await AuthCleanup.attemptSessionRecovery();
            if (recovered) {
              console.log('✅ Existing session recovery successful');
              setSessionHealthy(true);
            } else {
              console.error('❌ Existing session recovery failed');
              // Don't force logout here, let user try to navigate first
            }
          } else {
            console.log('✅ Existing session health validated successfully');
          }
        } catch (error) {
          console.error('❌ Existing session health check failed:', error);
          setSessionHealthy(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('🔓 Auth context signOut called');
    await SimpleAuth.signOut();
  };

  const value = {
    user,
    session,
    loading: loading || !sessionHealthy,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};