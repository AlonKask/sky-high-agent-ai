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
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    return btoa(fingerprint).substring(0, 32);
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

  validateSession(): boolean {
    try {
      const stored = localStorage.getItem(this.sessionKey);
      if (!stored) return false;

      const metadata: SessionMetadata = JSON.parse(stored);
      const currentFingerprint = this.generateDeviceFingerprint();
      
      // Check device fingerprint
      if (metadata.deviceFingerprint !== currentFingerprint) {
        this.invalidateSession('Device fingerprint mismatch');
        return false;
      }

      // Check inactivity timeout
      if (Date.now() - metadata.lastActivity > this.maxInactivity) {
        this.invalidateSession('Session timeout');
        return false;
      }

      // Update activity timestamp
      metadata.lastActivity = Date.now();
      localStorage.setItem(this.sessionKey, JSON.stringify(metadata));
      
      return true;
    } catch (error) {
      this.invalidateSession('Session validation error');
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

    // Monitor session every 60 seconds
    this.monitoringInterval = setInterval(() => {
      this.validateSession();
    }, 60000);

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