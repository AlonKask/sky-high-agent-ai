import { supabase } from "@/integrations/supabase/client";
import { enhancedSessionSecurity } from "@/utils/enhancedSessionSecurity";
import { logSecurityEvent } from "@/utils/enhancedSecurity";
import { cleanupAuthState } from "@/utils/authHelpers";

/**
 * Secure authentication manager
 * Consolidates all authentication operations with enhanced security
 */

export class SecureAuthManager {
  private static instance: SecureAuthManager;

  static getInstance(): SecureAuthManager {
    if (!SecureAuthManager.instance) {
      SecureAuthManager.instance = new SecureAuthManager();
    }
    return SecureAuthManager.instance;
  }

  async secureSignIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Pre-authentication cleanup
      cleanupAuthState();
      
      // Attempt to sign out any existing sessions
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('Pre-signin cleanup failed:', err);
      }

      // Validate input
      if (!email?.trim() || !password?.trim()) {
        throw new Error('Email and password are required');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        await logSecurityEvent(
          'sign_in_failure',
          'medium',
          { email: email.trim(), error: error.message }
        );
        
        // Return user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password' };
        } else if (error.message.includes('Too many requests')) {
          return { success: false, error: 'Too many attempts. Please wait before trying again.' };
        } else {
          return { success: false, error: 'Sign in failed. Please try again.' };
        }
      }

      if (data.user && data.session) {
        // Initialize secure session
        enhancedSessionSecurity.initializeSecureSession();
        
        // Log successful authentication
        await logSecurityEvent(
          'sign_in_success',
          'low',
          { 
            userId: data.user.id,
            email: data.user.email,
            timestamp: new Date().toISOString()
          }
        );

        return { success: true };
      }

      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      console.error('Secure sign in error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async secureSignOut(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await logSecurityEvent(
          'sign_out_initiated',
          'low',
          { 
            userId: user.id,
            timestamp: new Date().toISOString()
          }
        );
      }

      // Clean up session security
      enhancedSessionSecurity.secureSignOut();
      
      // Clean up auth state
      cleanupAuthState();
      
      // Force page reload for complete cleanup
      window.location.href = '/auth';
    } catch (error) {
      console.error('Secure sign out error:', error);
      // Force reload even if sign out fails
      window.location.href = '/auth';
    }
  }

  async validateCurrentSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return false;
      }

      // Validate with enhanced session security
      const isSecureSessionValid = await enhancedSessionSecurity.validateSession();
      
      if (!isSecureSessionValid) {
        await this.secureSignOut();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      // Validate session before returning user
      const isSessionValid = await this.validateCurrentSession();
      return isSessionValid ? user : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
}

export const secureAuthManager = SecureAuthManager.getInstance();