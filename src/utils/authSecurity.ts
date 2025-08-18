// Enhanced Authentication Security
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface SessionMetadata {
  lastActivity: number;
  userAgent: string;
  ipAddress?: string;
  deviceFingerprint: string;
}

class AuthSecurityManager {
  private static instance: AuthSecurityManager;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private sessionWarningTime = 5 * 60 * 1000; // 5 minutes before timeout
  private sessionCheckInterval = 60 * 1000; // Check every minute
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): AuthSecurityManager {
    if (!AuthSecurityManager.instance) {
      AuthSecurityManager.instance = new AuthSecurityManager();
    }
    return AuthSecurityManager.instance;
  }

  initializeSessionMonitoring(): void {
    // Start session monitoring
    this.intervalId = setInterval(() => {
      this.checkSessionValidity();
    }, this.sessionCheckInterval);

    // Monitor user activity
    this.setupActivityTracking();

    console.log('✅ Session security monitoring initialized');
  }

  private setupActivityTracking(): void {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const updateActivity = () => {
      this.updateSessionActivity();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
  }

  private updateSessionActivity(): void {
    const metadata: SessionMetadata = {
      lastActivity: Date.now(),
      userAgent: navigator.userAgent,
      deviceFingerprint: this.generateDeviceFingerprint()
    };

    localStorage.setItem('auth_session_metadata', JSON.stringify(metadata));
  }

  private generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');

    return btoa(fingerprint).substring(0, 32);
  }

  private async checkSessionValidity(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const metadataStr = localStorage.getItem('auth_session_metadata');
      if (!metadataStr) {
        await this.forceLogout('Missing session metadata');
        return;
      }

      const metadata: SessionMetadata = JSON.parse(metadataStr);
      const timeSinceActivity = Date.now() - metadata.lastActivity;

      // Check for session timeout
      if (timeSinceActivity > this.sessionTimeout) {
        await this.forceLogout('Session timeout');
        return;
      }

      // Warn about upcoming timeout
      if (timeSinceActivity > (this.sessionTimeout - this.sessionWarningTime)) {
        this.showSessionWarning(this.sessionTimeout - timeSinceActivity);
      }

      // Validate device fingerprint
      const currentFingerprint = this.generateDeviceFingerprint();
      if (metadata.deviceFingerprint !== currentFingerprint) {
        await this.forceLogout('Device fingerprint mismatch');
        return;
      }

    } catch (error) {
      console.error('Session validity check failed:', error);
    }
  }

  private showSessionWarning(timeRemaining: number): void {
    const minutes = Math.ceil(timeRemaining / 60000);
    
    // Only show warning once per session
    if (!sessionStorage.getItem('session_warning_shown')) {
      sessionStorage.setItem('session_warning_shown', 'true');
      
      const extend = confirm(
        `Your session will expire in ${minutes} minute(s). Would you like to extend it?`
      );
      
      if (extend) {
        this.updateSessionActivity();
        sessionStorage.removeItem('session_warning_shown');
      }
    }
  }

  private async forceLogout(reason: string): Promise<void> {
    console.warn(`🔒 Forced logout: ${reason}`);
    
    // Log security event
    await this.logSecurityEvent('forced_logout', 'medium', { reason });
    
    // Clear all auth data
    this.cleanup();
    
    // Sign out from Supabase
    await supabase.auth.signOut({ scope: 'global' });
    
    // Redirect to auth page
    window.location.href = '/auth';
  }

  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    } else {
      score += 2;
    }

    // Character variety checks
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
    } else {
      score += 1;
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain numbers');
    } else {
      score += 1;
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Password must contain special characters');
    } else {
      score += 1;
    }

    // Common patterns check
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password contains common patterns');
      score -= 2;
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.max(0, score)
    };
  }

  async enhancedSignIn(email: string, password: string): Promise<{
    success: boolean;
    error?: string;
    requiresMFA?: boolean;
  }> {
    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
      }

      // Rate limiting check (client-side basic check)
      if (!this.checkRateLimit(email)) {
        return { success: false, error: 'Too many login attempts. Please try again later.' };
      }

      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        await this.logSecurityEvent('login_failure', 'low', { 
          email, 
          error: error.message 
        });
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Initialize session metadata
        this.updateSessionActivity();
        
        // Log successful login
        await this.logSecurityEvent('login_success', 'low', { 
          userId: data.user.id 
        });

        return { success: true };
      }

      return { success: false, error: 'Login failed' };

    } catch (error) {
      console.error('Enhanced sign in error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private checkRateLimit(email: string): boolean {
    const key = `rate_limit_${email}`;
    const attempts = JSON.parse(localStorage.getItem(key) || '[]');
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    // Remove old attempts
    const recentAttempts = attempts.filter((time: number) => time > fiveMinutesAgo);
    
    // Check if rate limit exceeded (5 attempts in 5 minutes)
    if (recentAttempts.length >= 5) {
      return false;
    }

    // Record this attempt
    recentAttempts.push(now);
    localStorage.setItem(key, JSON.stringify(recentAttempts));
    
    return true;
  }

  private async logSecurityEvent(eventType: string, severity: string, details: any): Promise<void> {
    try {
      await supabase.functions.invoke('create-notification', {
        body: {
          type: 'security_event',
          event_type: eventType,
          severity,
          details,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  cleanup(): void {
    // Clear session data
    localStorage.removeItem('auth_session_metadata');
    sessionStorage.removeItem('session_warning_shown');
    
    // Clear Supabase auth data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });

    // Stop monitoring
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  destroy(): void {
    this.cleanup();
  }
}

export const authSecurity = AuthSecurityManager.getInstance();