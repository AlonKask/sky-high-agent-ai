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

  const refreshSession = async () => {
    try {
      console.log('🔄 Refreshing session...');
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Session refresh failed:', error);
        // If refresh fails, try to get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) {
          // No valid session, clear state and redirect to auth
          setSession(null);
          setUser(null);
          window.location.href = '/auth';
        }
        return;
      }
      
      console.log('✅ Session refreshed successfully');
      setSession(session);
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      setSession(null);
      setUser(null);
      window.location.href = '/auth';
    }
  };

  useEffect(() => {
    console.log('🔄 SimpleAuthProvider initializing...');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state change:', { 
          event, 
          hasSession: !!session, 
          hasUser: !!session?.user,
          sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000) : null
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // If we get a TOKEN_REFRESHED event but no session, there might be an issue
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('⚠️ Token refresh event but no session - attempting recovery');
          setTimeout(() => refreshSession(), 100);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Initial session check failed:', error);
        setLoading(false);
        return;
      }

      console.log('🔍 Initial session check:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id,
        sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000) : null,
        isExpired: session?.expires_at ? Date.now() / 1000 > session.expires_at : false
      });

      // If session is expired or about to expire, refresh it
      if (session?.expires_at && (Date.now() / 1000 > session.expires_at - 60)) {
        console.log('🔄 Session expired or expiring soon, refreshing...');
        refreshSession();
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      
      setLoading(false);
    });

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
        refreshSession
      }}
    >
      {children}
    </SimpleAuthContext.Provider>
  );
};