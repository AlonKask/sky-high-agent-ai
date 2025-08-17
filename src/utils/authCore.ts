/**
 * Core Authentication Service - Simplified and Reliable
 * Focuses on stability and consistent behavior
 */

import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

export class AuthCore {
  /**
   * Clean, simple email/password sign in
   */
  static async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      console.log('🔐 Starting sign-in for:', email);
      
      // Clear any existing session first
      await supabase.auth.signOut({ scope: 'local' });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Sign-in failed:', error.message);
        return {
          success: false,
          error: this.getReadableError(error.message)
        };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          error: 'Authentication failed - no user data returned'
        };
      }

      console.log('✅ Sign-in successful for:', data.user.email);
      return {
        success: true,
        user: data.user,
        session: data.session
      };

    } catch (error: any) {
      console.error('❌ Sign-in error:', error);
      return {
        success: false,
        error: error.message || 'Sign-in failed'
      };
    }
  }

  /**
   * Google OAuth sign in
   */
  static async signInWithGoogle(): Promise<AuthResult> {
    try {
      console.log('🔐 Starting Google OAuth...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        console.error('❌ Google OAuth failed:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Google OAuth initiated');
      return {
        success: true
      };

    } catch (error: any) {
      console.error('❌ Google OAuth error:', error);
      return {
        success: false,
        error: error.message || 'Google sign-in failed'
      };
    }
  }

  /**
   * Sign out user
   */
  static async signOut(): Promise<void> {
    try {
      console.log('🔓 Signing out...');
      
      await supabase.auth.signOut({ scope: 'global' });
      
      // Simple localStorage cleanup
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ Sign-out completed');
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('❌ Sign-out error:', error);
      // Force navigation even if sign-out fails
      window.location.href = '/auth';
    }
  }

  /**
   * Get current session
   */
  static async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Session check failed:', error);
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('❌ Session check error:', error);
      return null;
    }
  }

  /**
   * Simple session validation
   */
  static async validateSession(): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      return !!(session?.user);
    } catch (error) {
      console.error('❌ Session validation error:', error);
      return false;
    }
  }

  /**
   * Convert error messages to user-friendly format
   */
  private static getReadableError(message: string): string {
    if (message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials.';
    }
    
    if (message.includes('Email not confirmed')) {
      return 'Please check your email and confirm your account before signing in.';
    }
    
    if (message.includes('too many requests')) {
      return 'Too many sign-in attempts. Please wait a moment and try again.';
    }
    
    return message;
  }
}