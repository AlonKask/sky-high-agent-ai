import { supabase } from '@/integrations/supabase/client';
import { toastHelpers } from '@/utils/toastHelpers';

/**
 * Enhanced authentication cleanup utility
 * Prevents authentication limbo states by thoroughly cleaning all auth-related storage
 */
export const cleanupAuthState = () => {
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

/**
 * Enhanced sign-in with CAPTCHA support
 */
export const signInWithEmailPassword = async (
  email: string, 
  password: string, 
  captchaToken?: string
) => {
  try {
    // Clean up existing state first
    cleanupAuthState();
    
    // Attempt global sign out to clear any existing sessions
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Continue even if this fails
      console.warn('Sign out during cleanup failed:', err);
    }

    // Sign in with email and password using native CAPTCHA integration
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
      options: {
        ...(captchaToken && { captchaToken })
      }
    });

    if (error) {
      // Log authentication failure with proper categorization
      console.error('Authentication failed:', {
        error: error.message,
        email: email.trim(),
        hasCaptcha: !!captchaToken,
        timestamp: new Date().toISOString()
      });
      
      // Provide user-friendly error messages
      if (error.message.includes('captcha')) {
        throw new Error('CAPTCHA verification failed. Please try again.');
      } else if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please check your email and click the confirmation link before signing in.');
      } else if (error.message.includes('Too many requests')) {
        throw new Error('Too many sign-in attempts. Please wait a few minutes and try again.');
      } else {
        throw new Error(error.message || 'An unexpected error occurred during sign-in.');
      }
    }

    if (data.user && data.session) {
      // Log successful authentication
      console.log('Authentication successful:', {
        userId: data.user.id,
        email: data.user.email,
        timestamp: new Date().toISOString()
      });
      
      return { user: data.user, session: data.session };
    }

    throw new Error('Authentication failed: No user data received');
    
  } catch (error) {
    // Re-throw for proper error handling in the calling component
    throw error;
  }
};

/**
 * Enhanced Google OAuth sign-in
 */
export const signInWithGoogle = async () => {
  try {
    cleanupAuthState();
    
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.warn('Sign out during cleanup failed:', err);
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      console.error('Google OAuth failed:', error);
      throw new Error('Google sign-in failed. Please try again.');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Enhanced sign-out with complete cleanup
 */
export const signOut = async () => {
  try {
    // Clean up auth state first
    cleanupAuthState();
    
    // Attempt global sign out
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.warn('Sign out failed:', err);
    }
    
    // Force page reload for complete state reset
    window.location.href = '/auth';
    
  } catch (error) {
    console.error('Sign out error:', error);
    // Force reload even if sign out fails
    window.location.href = '/auth';
  }
};