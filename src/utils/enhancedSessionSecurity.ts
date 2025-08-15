import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Enhanced session security utilities
 * Provides secure session management and validation
 */

interface SessionMetadata {
  deviceFingerprint: string;
  lastActivity: number;
  userAgent: string;
  ipAddress?: string;
}

class EnhancedSessionSecurity {
  private static instance: EnhancedSessionSecurity;
  private sessionKey = 'secure_session_metadata';
  private maxInactivity = 30 * 60 * 1000; // 30 minutes
  private monitoringInterval: NodeJS.Timeout | null = null;

  static getInstance(): EnhancedSessionSecurity {
    if (!EnhancedSessionSecurity.instance) {
      EnhancedSessionSecurity.instance = new EnhancedSessionSecurity();
    }
    return EnhancedSessionSecurity.instance;
  }

  generateDeviceFingerprint(): string {
    // Use more stable browser properties, avoid canvas that changes between loads
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.platform || 'unknown',
      navigator.hardwareConcurrency || 'unknown'
    ].join('|');
    
    const encoded = btoa(fingerprint).substring(0, 32);
    console.log('[Enhanced Security] Generated stable device fingerprint:', encoded);
    return encoded;
  }

  initializeSecureSession(): void {
    const metadata: SessionMetadata = {
      deviceFingerprint: this.generateDeviceFingerprint(),
      lastActivity: Date.now(),
      userAgent: navigator.userAgent
    };
    
    localStorage.setItem(this.sessionKey, JSON.stringify(metadata));
    this.startSessionMonitoring();
  }

  async validateSession(): Promise<boolean> {
    try {
      const stored = localStorage.getItem(this.sessionKey);
      if (!stored) {
        console.log('[Enhanced Security] No stored session metadata');
        return await this.attemptSessionRecovery();
      }

      const metadata: SessionMetadata = JSON.parse(stored);
      const currentFingerprint = this.generateDeviceFingerprint();
      
      console.log('[Enhanced Security] Validating session:', {
        storedFingerprint: metadata.deviceFingerprint,
        currentFingerprint,
        lastActivity: new Date(metadata.lastActivity),
        inactivityPeriod: Date.now() - metadata.lastActivity
      });
      
      // Check device fingerprint with grace period
      if (metadata.deviceFingerprint !== currentFingerprint) {
        console.warn('[Enhanced Security] Device fingerprint mismatch, attempting recovery');
        return await this.attemptSessionRecovery();
      }

      // Check inactivity timeout
      if (Date.now() - metadata.lastActivity > this.maxInactivity) {
        console.warn('[Enhanced Security] Session timeout, attempting recovery');
        return await this.attemptSessionRecovery();
      }

      // Update activity timestamp
      metadata.lastActivity = Date.now();
      localStorage.setItem(this.sessionKey, JSON.stringify(metadata));
      
      console.log('[Enhanced Security] Session validation successful');
      return true;
    } catch (error) {
      console.error('[Enhanced Security] Session validation error:', error);
      return await this.attemptSessionRecovery();
    }
  }

  private async attemptSessionRecovery(): Promise<boolean> {
    try {
      console.log('[Enhanced Security] Attempting session recovery...');
      
      // Check if Supabase session is still valid
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('[Enhanced Security] No valid Supabase session, session recovery failed');
        return false;
      }

      console.log('[Enhanced Security] Valid Supabase session found, regenerating security metadata');
      
      // Regenerate session metadata with current fingerprint
      const metadata: SessionMetadata = {
        deviceFingerprint: this.generateDeviceFingerprint(),
        lastActivity: Date.now(),
        userAgent: navigator.userAgent
      };
      
      localStorage.setItem(this.sessionKey, JSON.stringify(metadata));
      console.log('[Enhanced Security] Session recovery successful');
      return true;
    } catch (error) {
      console.error('[Enhanced Security] Session recovery failed:', error);
      return false;
    }
  }

  updateActivity(): void {
    try {
      const stored = localStorage.getItem(this.sessionKey);
      if (stored) {
        const metadata: SessionMetadata = JSON.parse(stored);
        metadata.lastActivity = Date.now();
        localStorage.setItem(this.sessionKey, JSON.stringify(metadata));
      }
    } catch (error) {
      // Silent fail
    }
  }

  private invalidateSession(reason: string): void {
    console.warn('[Enhanced Security] Invalidating session:', reason);
    localStorage.removeItem(this.sessionKey);
    this.cleanupAuthState();
    
    toast({
      title: "Session Invalid",
      description: "Your session has expired. Please sign in again.",
      variant: "destructive",
    });

    // Redirect to auth page
    window.location.href = '/auth';
  }

  private cleanupAuthState(): void {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  }

  private startSessionMonitoring(): void {
    // Clean up existing monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    console.log('[Enhanced Security] Starting session monitoring with recovery logic');

    // Monitor session every 2 minutes (less aggressive)
    this.monitoringInterval = setInterval(async () => {
      const isValid = await this.validateSession();
      if (!isValid) {
        console.warn('[Enhanced Security] Session validation failed during monitoring');
      }
    }, 120000);

    // Set up activity tracking
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const throttledUpdate = this.throttle(() => this.updateActivity(), 5000);
    
    events.forEach(event => {
      document.addEventListener(event, throttledUpdate, true);
    });
  }

  private throttle(func: Function, limit: number) {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  secureSignOut(): void {
    this.cleanupAuthState();
    localStorage.removeItem(this.sessionKey);
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    supabase.auth.signOut({ scope: 'global' }).finally(() => {
      window.location.href = '/auth';
    });
  }

  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export const enhancedSessionSecurity = EnhancedSessionSecurity.getInstance();