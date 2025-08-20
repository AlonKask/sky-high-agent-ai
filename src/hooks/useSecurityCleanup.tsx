import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * SECURITY FIX: Enhanced authentication cleanup hook
 * Prevents authentication limbo states and ensures clean user sessions
 */
export const useSecurityCleanup = () => {
  // Clean up any leftover authentication state
  const cleanupAuthState = () => {
    try {
      // Remove all Supabase auth keys from localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Remove from sessionStorage if in use
      if (typeof sessionStorage !== 'undefined') {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.error('Error cleaning auth state:', error);
    }
  };

  // Secure sign out function
  const secureSignOut = async () => {
    try {
      // Clean up auth state first
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('Sign out error (non-blocking):', err);
      }
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Secure sign out error:', error);
      // Force reload anyway for safety
      window.location.href = '/auth';
    }
  };

  // Secure sign in function
  const secureSignIn = async (email: string, password: string) => {
    try {
      // Clean up existing state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
      // Sign in with email/password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Force page reload for clean state
        window.location.href = '/';
        return { success: true };
      }
      
      return { success: false, error: 'No user returned' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Initialize cleanup on mount
  useEffect(() => {
    // Clean up any stale auth state on app load
    const currentSession = supabase.auth.getSession();
    if (!currentSession) {
      cleanupAuthState();
    }
  }, []);

  return {
    cleanupAuthState,
    secureSignOut,
    secureSignIn
  };
};