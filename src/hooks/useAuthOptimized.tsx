import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { SimpleAuth } from '@/utils/simpleAuth';
import { AuthCleanup } from '@/utils/authCleanup';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sessionHealthy: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionHealthy, setSessionHealthy] = useState(true);

  useEffect(() => {
    console.log('🔄 AuthProvider: Starting initialization...');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthProvider: Auth state change:', { 
          event, 
          hasSession: !!session, 
          hasUser: !!session?.user,
          email: session?.user?.email,
          userId: session?.user?.id
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        console.log('✅ AuthProvider: State updated - loading set to false');

        // Light session validation on sign-in (no aggressive health checks)
        if (event === 'SIGNED_IN' && session) {
          try {
            const health = await AuthCleanup.validateSessionHealth();
            setSessionHealthy(health.isHealthy);
            
            if (!health.isHealthy) {
              console.warn('⚠️ Session health check failed on sign-in:', health);
              // Don't force logout immediately - give user a chance
            }
          } catch (error) {
            console.error('❌ Session health check error:', error);
            setSessionHealthy(false);
          }
        }
      }
    );

    // Check for existing session
    console.log('🔍 AuthProvider: Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ AuthProvider: Initial session check failed:', error);
        setLoading(false);
        return;
      }

      console.log('🔍 AuthProvider: Initial session check result:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id,
        email: session?.user?.email
      });

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      console.log('✅ AuthProvider: Initial check complete - loading set to false');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Periodic health monitoring (reduced frequency)
  useEffect(() => {
    if (!user || !session) return;

    const healthInterval = setInterval(async () => {
      try {
        const health = await AuthCleanup.validateSessionHealth();
        setSessionHealthy(health.isHealthy);
        
        if (!health.isHealthy) {
          console.warn('⚠️ Periodic health check failed:', health);
          
          // Attempt graceful recovery without forcing logout
          const recovered = await AuthCleanup.attemptSessionRecovery();
          if (recovered) {
            console.log('✅ Session recovery successful');
            setSessionHealthy(true);
          } else {
            console.warn('⚠️ Session recovery failed - user may need to re-authenticate');
            setSessionHealthy(false);
          }
        }
      } catch (error) {
        console.error('❌ Health monitoring error:', error);
        setSessionHealthy(false);
      }
    }, 300000); // Every 5 minutes (reduced from 15 seconds)

    return () => {
      clearInterval(healthInterval);
    };
  }, [user, session]);

  const signOut = async () => {
    console.log('🔓 Auth context signOut called');
    await SimpleAuth.signOut();
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session, 
        loading, 
        sessionHealthy, 
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};