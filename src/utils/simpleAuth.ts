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
  static async signInWithEmail(email: string, password: string, captchaToken?: string): Promise<{
    success: boolean;
    user?: any;
    session?: any;
    error?: string;
  }> {
    try {
      console.log('🔐 Starting simple auth sign-in...');
      
      // 1. Emergency cleanup first
      await AuthCleanup.emergencyAuthCleanup();
      
      // Wait a moment for cleanup to settle
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. Attempt sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Supabase sign-in failed:', error);
        return {
          success: false,
          error: error.message
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

      // 3. Validate session health immediately
      const health = await AuthCleanup.validateSessionHealth();
      
      if (!health.isHealthy) {
        console.error('❌ Session health check failed after sign-in:', health);
        
        // Try session recovery once
        const recovered = await AuthCleanup.attemptSessionRecovery();
        if (!recovered) {
          return {
            success: false,
            error: `Session validation failed: ${health.error}`
          };
        }
      }

      console.log('✅ Session health validated successfully');

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
      
      // 1. Emergency cleanup first
      await AuthCleanup.emergencyAuthCleanup();
      
      // Wait a moment for cleanup to settle
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. Start OAuth flow
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

      console.log('✅ Google OAuth initiated successfully');
      
      return {
        success: true
      };

    } catch (error: any) {
      console.error('❌ Google OAuth sign-in failed:', error);
      return {
        success: false,
        error: error.message || 'Google sign-in failed'
      };
    }
  }

  /**
   * Simple sign out with cleanup
   */
  static async signOut(): Promise<void> {
    try {
      console.log('🔓 Starting simple sign-out...');
      
      // 1. Emergency cleanup (includes Supabase signout)
      await AuthCleanup.emergencyAuthCleanup();
      
      console.log('✅ Sign-out completed');
      
      // 2. Force page refresh to clear any remaining state
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('❌ Sign-out failed:', error);
      // Force cleanup anyway
      await AuthCleanup.emergencyAuthCleanup();
      window.location.href = '/auth';
    }
  }
}