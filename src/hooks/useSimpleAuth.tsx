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
  
  // Rate limiting protection
  let isRefreshing = false;
  let lastRefreshAttempt = 0;
  const RATE_LIMIT_DELAY = 5000; // 5 seconds between refresh attempts

  const refreshSession = async () => {
    const now = Date.now();
    
    // Prevent concurrent refreshes and rate limiting
    if (isRefreshing || (now - lastRefreshAttempt < RATE_LIMIT_DELAY)) {
      console.log('⏳ Refresh already in progress or rate limited');
      return;
    }

    try {
      isRefreshing = true;
      lastRefreshAttempt = now;
      
      console.log('🔄 Refreshing session...');
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Session refresh failed:', error);
        
        // Handle rate limiting specifically
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          console.log('⏳ Rate limited, backing off...');
          return;
        }
        
        // Clear auth state on other errors
        setSession(null);
        setUser(null);
        return;
      }
      
      console.log('✅ Session refreshed successfully');
      setSession(session);
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      setSession(null);
      setUser(null);
    } finally {
      isRefreshing = false;
    }
  };

  useEffect(() => {
    console.log('🔄 SimpleAuthProvider initializing...');

    // Set up auth state listener - SIMPLIFIED to prevent loops
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state change:', { 
          event, 
          hasSession: !!session, 
          hasUser: !!session?.user
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // REMOVED: TOKEN_REFRESHED handler that caused loops
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
        userId: session?.user?.id
      });

      // SIMPLIFIED: Just set the session, let auto-refresh handle expiration
      setSession(session);
      setUser(session?.user ?? null);
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