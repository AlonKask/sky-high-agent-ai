import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from '@/utils/secureLogger';

interface SecureAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sessionValid: boolean;
  signOut: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  sessionLastValidated: number;
}

const SecureAuthContext = createContext<SecureAuthContextType | undefined>(undefined);

export const useSecureAuth = () => {
  const context = useContext(SecureAuthContext);
  if (context === undefined) {
    throw new Error('useSecureAuth must be used within a SecureAuthProvider');
  }
  return context;
};

export const SecureAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [sessionLastValidated, setSessionLastValidated] = useState(0);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');

  // Generate device fingerprint for session security
  const generateDeviceFingerprint = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = btoa(JSON.stringify({
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}`,
      canvas: canvas.toDataURL(),
      timestamp: Date.now()
    })).substring(0, 32);
    
    return fingerprint;
  }, []);

  // Enhanced session validation
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      if (!session) {
        setSessionValid(false);
        return false;
      }

      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        secureLogger.warn('Session expired', { expires_at: session.expires_at, current_time: now });
        await signOut();
        return false;
      }

      // Validate with Supabase
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error || !currentUser) {
        secureLogger.warn('Session validation failed', { error: error?.message });
        await signOut();
        return false;
      }

      // Check device fingerprint consistency with protective action
      const storedFingerprint = localStorage.getItem('device_fingerprint');
      if (storedFingerprint && storedFingerprint !== deviceFingerprint) {
        secureLogger.error('Device fingerprint mismatch - potential session hijacking', {
          stored: storedFingerprint.substring(0, 8),
          current: deviceFingerprint.substring(0, 8)
        });
        
        // Log security event and take protective action
        try {
          await supabase.rpc('simple_log_event', {
            p_user_id: user?.id,
            p_event_type: 'device_fingerprint_mismatch',
            p_severity: 'high',
            p_details: {
              stored_fingerprint: storedFingerprint.substring(0, 8),
              current_fingerprint: deviceFingerprint.substring(0, 8),
              potential_hijacking: true
            }
          });
        } catch (logError) {
          secureLogger.warn('Failed to log security event', { error: logError });
        }
        
        // Show warning to user but allow session to continue (first time)
        const mismatchCount = parseInt(localStorage.getItem('fingerprint_mismatch_count') || '0') + 1;
        localStorage.setItem('fingerprint_mismatch_count', mismatchCount.toString());
        
        if (mismatchCount >= 3) {
          // Force logout after 3 mismatches
          secureLogger.error('Multiple device fingerprint mismatches - forcing logout');
          await signOut();
          return false;
        } else {
          // Update stored fingerprint but warn user
          localStorage.setItem('device_fingerprint', deviceFingerprint);
          secureLogger.warn(`Device fingerprint updated (mismatch ${mismatchCount}/3)`);
        }
      } else {
        // Reset mismatch count on successful validation
        localStorage.removeItem('fingerprint_mismatch_count');
      }

      setSessionValid(true);
      setSessionLastValidated(Date.now());
      secureLogger.debug('Session validation successful');
      return true;
    } catch (error) {
      secureLogger.error('Session validation error', { error });
      setSessionValid(false);
      return false;
    }
  }, [session, deviceFingerprint]);

  // Secure sign out with cleanup
  const signOut = useCallback(async () => {
    try {
      secureLogger.info('Secure sign out initiated');
      
      // Clear local state first
      setUser(null);
      setSession(null);
      setSessionValid(false);
      
      // Clear device fingerprint
      localStorage.removeItem('device_fingerprint');
      
      // Clear all Supabase auth keys from localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Attempt Supabase sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (signOutError) {
        secureLogger.warn('Supabase sign out error (non-blocking)', { error: signOutError });
      }
      
      secureLogger.info('Secure sign out completed');
      
      // Force page reload for complete cleanup
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
      
    } catch (error) {
      secureLogger.error('Secure sign out error', { error });
      // Force reload anyway for safety
      window.location.href = '/auth';
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        secureLogger.info('SecureAuthProvider initializing...');
        
        // Generate and store device fingerprint
        const fingerprint = generateDeviceFingerprint();
        setDeviceFingerprint(fingerprint);
        localStorage.setItem('device_fingerprint', fingerprint);

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            secureLogger.info('Auth state change', { 
              event, 
              hasSession: !!session, 
              hasUser: !!session?.user 
            });
            
            setSession(session);
            setUser(session?.user ?? null);
            
            // Validate new sessions
            if (session && event === 'SIGNED_IN') {
              setTimeout(async () => {
                await validateSession();
              }, 0);
            }
            
            setLoading(false);
          }
        );

        // Check for existing session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          secureLogger.error('Initial session check failed', { error });
          setLoading(false);
          return;
        }

        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        // Validate existing session if present
        if (initialSession) {
          setTimeout(async () => {
            await validateSession();
          }, 0);
        }
        
        setLoading(false);

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        secureLogger.error('Auth initialization error', { error });
        setLoading(false);
      }
    };

    initializeAuth();
  }, [generateDeviceFingerprint, validateSession]);

  // Periodic session validation (every 5 minutes)
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(async () => {
      if (session && sessionValid) {
        const isValid = await validateSession();
        if (!isValid) {
          secureLogger.warn('Periodic session validation failed - signing out');
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [session, sessionValid, validateSession]);

  const value = {
    user,
    session,
    loading,
    sessionValid,
    signOut,
    validateSession,
    sessionLastValidated
  };

  return (
    <SecureAuthContext.Provider value={value}>
      {children}
    </SecureAuthContext.Provider>
  );
};