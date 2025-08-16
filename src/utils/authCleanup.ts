/**
 * Emergency Authentication Cleanup Utility
 * Handles complete auth state reset to prevent session conflicts
 */

import { supabase } from "@/integrations/supabase/client";

export class AuthCleanup {
  /**
   * Complete authentication state cleanup
   * Clears all authentication-related data from browser storage
   */
  static async emergencyAuthCleanup(): Promise<void> {
    console.log('🧹 Starting emergency auth cleanup...');
    
    try {
      // 1. Clear ALL Supabase auth-related localStorage keys
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith('supabase.auth.') ||
          key.includes('sb-') ||
          key.startsWith('auth_') ||
          key.startsWith('secure_') ||
          key.includes('session') ||
          key.includes('token') ||
          key.includes('security')
        ) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed localStorage key: ${key}`);
        }
      });

      // 2. Clear sessionStorage
      Object.keys(sessionStorage).forEach((key) => {
        if (
          key.startsWith('supabase.auth.') ||
          key.includes('sb-') ||
          key.startsWith('auth_') ||
          key.includes('session') ||
          key.includes('security')
        ) {
          sessionStorage.removeItem(key);
          console.log(`🗑️ Removed sessionStorage key: ${key}`);
        }
      });

      // 3. Force global sign out from Supabase (ignores errors)
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log('✅ Supabase global signout completed');
      } catch (error) {
        console.warn('⚠️ Supabase signout failed (continuing cleanup):', error);
      }

      // 4. Clear any remaining auth cookies or IndexedDB data
      try {
        // Clear any potential auth cookies
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
          if (name.includes('auth') || name.includes('supabase') || name.includes('sb-')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }
        });
      } catch (error) {
        console.warn('⚠️ Cookie cleanup failed:', error);
      }

      console.log('✅ Emergency auth cleanup completed');
    } catch (error) {
      console.error('❌ Emergency auth cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Validate session health with database
   * Checks if auth.uid() works and session is valid
   */
  static async validateSessionHealth(): Promise<{
    isHealthy: boolean;
    hasSession: boolean;
    hasUser: boolean;
    dbConnectionValid: boolean;
    authUidValid: boolean;
    error?: string;
  }> {
    try {
      // Check frontend session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        return {
          isHealthy: false,
          hasSession: false,
          hasUser: false,
          dbConnectionValid: false,
          authUidValid: false,
          error: `Session error: ${sessionError.message}`
        };
      }

      const hasSession = !!session;
      const hasUser = !!session?.user;

      if (!hasSession || !hasUser) {
        return {
          isHealthy: false,
          hasSession,
          hasUser,
          dbConnectionValid: false,
          authUidValid: false,
          error: 'No valid session or user'
        };
      }

      // Test database connection and auth.uid()
      try {
        const { data, error: dbError } = await supabase
          .from('user_roles')
          .select('user_id')
          .limit(1);

        if (dbError) {
          return {
            isHealthy: false,
            hasSession,
            hasUser,
            dbConnectionValid: false,
            authUidValid: false,
            error: `DB connection failed: ${dbError.message}`
          };
        }

        // Test auth.uid() by calling a function that uses it
        const { data: healthData, error: healthError } = await supabase.rpc('health_check');
        
        const dbConnectionValid = !dbError;
        const authUidValid = !healthError;

        return {
          isHealthy: hasSession && hasUser && dbConnectionValid && authUidValid,
          hasSession,
          hasUser,
          dbConnectionValid,
          authUidValid,
          error: healthError?.message
        };

      } catch (dbError: any) {
        return {
          isHealthy: false,
          hasSession,
          hasUser,
          dbConnectionValid: false,
          authUidValid: false,
          error: `Database test failed: ${dbError.message}`
        };
      }

    } catch (error: any) {
      return {
        isHealthy: false,
        hasSession: false,
        hasUser: false,
        dbConnectionValid: false,
        authUidValid: false,
        error: `Session validation failed: ${error.message}`
      };
    }
  }

  /**
   * Phase 2: Enhanced session recovery with forced refresh
   * Tries to restore a working session state and fix auth.uid() desync
   */
  static async attemptSessionRecovery(): Promise<boolean> {
    console.log('🔄 Attempting enhanced session recovery...');
    
    try {
      // First, refresh the current session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.log('❌ Session refresh failed, attempting forced recovery');
        // Try to force a complete re-authentication
        return await this.forceSessionRecovery();
      }

      // Validate the refreshed session works with database
      const health = await this.validateSessionHealth();
      
      if (health.isHealthy) {
        console.log('✅ Session recovery successful');
        return true;
      } else {
        console.log('❌ Session recovery failed - database issues:', health.error);
        return await this.forceSessionRecovery();
      }

    } catch (error) {
      console.error('❌ Session recovery failed:', error);
      return await this.forceSessionRecovery();
    }
  }

  /**
   * Phase 2: Force session recovery when normal refresh fails
   * Performs complete cleanup and attempts to restore from local session
   */
  static async forceSessionRecovery(): Promise<boolean> {
    console.log('🚨 Attempting forced session recovery...');
    
    try {
      // Get current session data before cleanup
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('❌ No session to recover from');
        return false;
      }

      // Perform emergency cleanup
      await this.emergencyAuthCleanup();
      
      // Try to restore session with explicit token refresh
      const { error: setError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      if (setError) {
        console.error('❌ Failed to restore session:', setError);
        return false;
      }

      // Validate restored session
      const health = await this.validateSessionHealth();
      if (health.isHealthy) {
        console.log('✅ Forced session recovery successful');
        return true;
      }

      console.log('❌ Forced session recovery failed');
      return false;

    } catch (error) {
      console.error('❌ Forced session recovery failed:', error);
      return false;
    }
  }

  /**
   * Phase 2: Check if session is desynced (frontend has user but auth.uid() is NULL)
   */
  static async detectSessionDesync(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        return false; // No session, so no desync
      }

      // Check if auth.uid() works in database
      const health = await this.validateSessionHealth();
      
      if (health.hasSession && health.hasUser && !health.authUidValid) {
        console.warn('🚨 Session desync detected: Frontend has user but auth.uid() is NULL');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to detect session desync:', error);
      return false;
    }
  }
}