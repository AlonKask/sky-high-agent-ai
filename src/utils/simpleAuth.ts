/**
 * Simplified Authentication Helper
 * Bypasses complex security layers for reliable authentication
 */

import { supabase } from "@/integrations/supabase/client";
import { AuthCleanup } from "./authCleanup";

export class SimpleAuth {
  /**
   * Simple email/password sign in with cleanup
   */
  static async signInWithEmail(email: string, password: string): Promise<{
    success: boolean;
    user?: any;
    session?: any;
    error?: string;
  }> {
    try {
      console.log('🔐 Starting simple auth sign-in...', {
        email
      });

      // Attempt sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Supabase sign-in failed:', error);
        
        // Enhanced error handling
        let errorMessage = error.message;
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in.';
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }

      if (!data.user || !data.session) {
        console.error('❌ Sign-in succeeded but no user/session returned');
        return {
          success: false,
          error: 'Authentication failed - no user data returned'
        };
      }

      console.log('✅ Supabase sign-in successful:', {
        userId: data.user.id,
        email: data.user.email
      });

      return {
        success: true,
        user: data.user,
        session: data.session
      };

    } catch (error: any) {
      console.error('❌ Simple auth sign-in failed:', error);
      return {
        success: false,
        error: error.message || 'Sign-in failed'
      };
    }
  }

  /**
   * Simple Google OAuth sign in
   */
  static async signInWithGoogle(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('🔐 Starting Google OAuth sign-in...');

      // Start OAuth flow with proper callback URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('❌ Google OAuth failed:', error);
        
        // Enhanced error handling with user-friendly messages
        let userMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Google sign-in was cancelled or failed. Please try again.';
        } else if (error.message.includes('network')) {
          userMessage = 'Network error during Google sign-in. Please check your connection.';
        } else if (error.message.includes('popup')) {
          userMessage = 'Pop-up blocked. Please allow pop-ups and try again.';
        }
        
        return {
          success: false,
          error: userMessage
        };
      }

      console.log('✅ Google OAuth initiated successfully - redirecting to Google...');
      
      return {
        success: true
      };

    } catch (error: any) {
      console.error('❌ Google OAuth sign-in failed:', error);
      
      // Enhanced error logging
      let userMessage = 'Google sign-in failed. Please try again.';
      if (error.message?.includes('popup')) {
        userMessage = 'Pop-up was blocked or closed. Please allow pop-ups and try again.';
      } else if (error.message?.includes('network')) {
        userMessage = 'Network error. Please check your internet connection.';
      }
      
      return {
        success: false,
        error: userMessage
      };
    }
  }

  /**
   * Simple sign out with cleanup
   */
  static async signOut(): Promise<void> {
    try {
      console.log('🔓 Starting simple sign-out...');
      
      // 1. Sign out of Supabase gracefully
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (error) {
        console.warn('Sign out error (continuing anyway):', error);
      }
      
      // 2. Light cleanup of auth state
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Storage cleanup error (non-critical):', error);
      }
      
      console.log('✅ Graceful sign-out completed');
      
      // 3. Navigate without forced reload
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('❌ Sign-out failed:', error);
      // Fallback: still navigate to auth
      window.location.href = '/auth';
    }
  }
}