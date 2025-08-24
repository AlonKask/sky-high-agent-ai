import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SimpleAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
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
  
  // Simple session refresh without complex validation
  const refreshSession = async (): Promise<boolean> => {
    try {
      console.log('🔄 Refreshing session...');
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      
      if (error || !newSession) {
        console.error('❌ Session refresh failed:', error);
        return false;
      }
      
      console.log('✅ Session refreshed successfully', {
        userId: newSession.user.id,
        hasAccessToken: !!newSession.access_token,
        expiresAt: newSession.expires_at ? new Date(newSession.expires_at * 1000) : null
      });
      setSession(newSession);
      setUser(newSession.user);
      return true;
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      return false;
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
          userId: session?.user?.id,
          accessToken: session?.access_token ? 'present' : 'missing'
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Initial session check failed:', error);
          setLoading(false);
          return;
        }

        console.log('🔍 Initial session check:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          userId: session?.user?.id,
          hasAccessToken: !!session?.access_token,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null
        });

        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('❌ Session check error:', error);
        setSession(null);
        setUser(null);
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
    console.log('🔓 Simple signOut called');
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
      } else {
        console.log('✅ Successfully signed out');
        // Clear state
        setSession(null);
        setUser(null);
        // Redirect to auth page
        window.location.href = '/auth';
      }
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
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