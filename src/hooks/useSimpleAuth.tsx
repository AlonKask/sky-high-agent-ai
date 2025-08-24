import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { secureAuthManager } from '@/utils/secureAuthManager';
import { enhancedSecurityMonitoring } from '@/utils/enhancedSecurityMonitoring';

interface SimpleAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const useSimpleAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
};

export const SimpleAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Validate session before database operations
  const validateSession = async (): Promise<boolean> => {
    if (!session) {
      console.log('❌ No session available for validation');
      return false;
    }

    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    
    if (expiresAt && now >= expiresAt) {
      console.log('❌ Session has expired, clearing auth state');
      await clearAuthState();
      return false;
    }

    return true;
  };

  const clearAuthState = async () => {
    console.log('🧹 Clearing authentication state');
    setSession(null);
    setUser(null);
    
    // Clear any stored auth tokens
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Error during local signout:', error);
    }
  };

  const refreshSession = async () => {
    // Simplified refresh without rate limiting complexity
    try {
      console.log('🔄 Refreshing session...');
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      
      if (error || !newSession) {
        console.error('❌ Session refresh failed:', error);
        await clearAuthState();
        return false;
      }
      
      console.log('✅ Session refreshed successfully');
      setSession(newSession);
      setUser(newSession.user);
      return true;
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      await clearAuthState();
      return false;
    }
  };

  useEffect(() => {
    console.log('🔄 SimpleAuthProvider initializing...');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', { 
          event, 
          hasSession: !!session, 
          hasUser: !!session?.user,
          userId: session?.user?.id
        });
        
        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out, clearing state');
          setSession(null);
          setUser(null);
        } else if (event === 'SIGNED_IN' && session) {
          console.log('👋 User signed in, setting session');
          setSession(session);
          setUser(session.user);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('🔄 Token refreshed, updating session');
          setSession(session);
          setUser(session.user);
        } else if (!session) {
          console.log('❌ No session in auth state change, clearing state');
          setSession(null);
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Initial session check failed:', error);
          await clearAuthState();
          setLoading(false);
          return;
        }

        console.log('🔍 Initial session check:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          userId: session?.user?.id,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null
        });

        if (session) {
          // Validate the session is still valid
          const now = Math.floor(Date.now() / 1000);
          if (session.expires_at && now >= session.expires_at) {
            console.log('❌ Session expired, attempting refresh');
            const refreshed = await refreshSession();
            if (!refreshed) {
              await clearAuthState();
            }
          } else {
            setSession(session);
            setUser(session.user);
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Session check error:', error);
        await clearAuthState();
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('🔓 Secure signOut called');
    
    // Use secure auth manager for enhanced sign-out
    await secureAuthManager.secureSignOut();
  };

  return (
    <SimpleAuthContext.Provider 
      value={{ 
        user, 
        session, 
        loading, 
        signOut,
        refreshSession: async () => {
          const isValid = await validateSession();
          if (!isValid) {
            await refreshSession();
          }
        }
      }}
    >
      {children}
    </SimpleAuthContext.Provider>
  );
};