/**
 * Unified Security Service - Enterprise-grade security management
 * Consolidates all security-related functionality into a single service
 */

import { supabase } from "@/integrations/supabase/client";

export interface SecurityMetrics {
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  critical_events: number;
  high_events: number;
  medium_events: number;
  low_events: number;
  total_events: number;
  calculation_time: string;
  time_window_hours: number;
}

export interface SessionAnomalyResult {
  anomaly_detected: boolean;
  anomaly_score: number;
  requires_verification: boolean;
  force_logout: boolean;
  reason?: string;
  timestamp: string;
}

export interface DeviceFingerprint {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  cookiesEnabled: boolean;
}

export class SecurityService {
  private static deviceFingerprint: DeviceFingerprint | null = null;

  /**
   * Generate unique device fingerprint for anomaly detection
   */
  static generateDeviceFingerprint(): DeviceFingerprint {
    if (this.deviceFingerprint) {
      return this.deviceFingerprint;
    }

    this.deviceFingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: navigator.cookieEnabled
    };

    return this.deviceFingerprint;
  }

  /**
   * Calculate comprehensive security metrics
   */
  static async calculateSecurityMetrics(timeWindowHours: number = 24): Promise<SecurityMetrics | null> {
    try {
      const { data, error } = await supabase.rpc('calculate_security_metrics', {
        p_time_window_hours: timeWindowHours
      });

      if (error) {
        console.error('Security metrics calculation failed:', error);
        return null;
      }

      return data as unknown as SecurityMetrics;
    } catch (error) {
      console.error('Security metrics error:', error);
      return null;
    }
  }

  /**
   * Detect session anomalies with advanced fingerprinting
   */
  static async detectSessionAnomaly(
    currentFingerprint?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SessionAnomalyResult | null> {
    try {
      const fingerprint = currentFingerprint || JSON.stringify(this.generateDeviceFingerprint());
      
      const { data, error } = await supabase.rpc('detect_session_anomaly', {
        p_current_fingerprint: fingerprint,
        p_ip_address: ipAddress,
        p_user_agent: userAgent || navigator.userAgent
      });

      if (error) {
        console.error('Session anomaly detection failed:', error);
        return null;
      }

      return data as unknown as SessionAnomalyResult;
    } catch (error) {
      console.error('Session anomaly error:', error);
      return null;
    }
  }

  /**
   * Advanced rate limiting with IP tracking
   */
  static async checkAdvancedRateLimit(
    identifier: string,
    endpoint: string,
    ipAddress?: string,
    maxRequests: number = 10,
    windowMinutes: number = 15
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('advanced_rate_limit_check', {
        p_identifier: identifier,
        p_endpoint: endpoint,
        p_ip_address: ipAddress,
        p_max_requests: maxRequests,
        p_window_minutes: windowMinutes
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        return false;
      }

      return data as boolean;
    } catch (error) {
      console.error('Rate limit error:', error);
      return false;
    }
  }

  /**
   * Log security events with enhanced context
   */
  static async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      const enhancedDetails = {
        ...details,
        fingerprint: JSON.stringify(this.generateDeviceFingerprint()),
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_severity: severity,
        p_details: enhancedDetails
      });

      if (error) {
        console.error('Security event logging failed:', error);
      }
    } catch (error) {
      console.error('Security event error:', error);
    }
  }

  /**
   * Start comprehensive security monitoring
   */
  static startSecurityMonitoring(): () => void {
    console.log('🛡️ Starting security monitoring...');

    // Log initial session start
    this.logSecurityEvent('security_monitoring_started', 'low', {
      monitoring_enabled: true,
      device_fingerprint: this.generateDeviceFingerprint()
    });

    // Monitor for suspicious console activities
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ').toLowerCase();
      if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('access denied')) {
        this.logSecurityEvent('suspicious_console_activity', 'medium', {
          error_message: message,
          stack_trace: new Error().stack
        });
      }
      originalConsoleError.apply(console, args);
    };

    // Monitor for suspicious DOM manipulation
    const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (originalInnerHTML?.set) {
      Object.defineProperty(Element.prototype, 'innerHTML', {
        set: function(value: string) {
          if (typeof value === 'string' && (value.includes('<script') || value.includes('javascript:'))) {
            SecurityService.logSecurityEvent('potential_xss_attempt', 'high', {
              attempted_content: value.substring(0, 200),
              element_tag: this.tagName
            });
          }
          originalInnerHTML.set?.call(this, value);
        },
        get: originalInnerHTML.get
      });
    }

    // Cleanup function
    return () => {
      console.error = originalConsoleError;
      if (originalInnerHTML?.set) {
        Object.defineProperty(Element.prototype, 'innerHTML', originalInnerHTML);
      }
      console.log('🛡️ Security monitoring stopped');
    };
  }

  /**
   * Validate input for security threats
   */
  static sanitizeInput(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .substring(0, maxLength)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '')
      .trim();
  }

  /**
   * Validate email format with security checks
   */
  static validateEmailSecurity(email: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!email || typeof email !== 'string') {
      errors.push('Email is required');
      return { isValid: false, errors };
    }
    
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
    
    if (email.length > 320) {
      errors.push('Email too long');
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /javascript:/i,
      /<script/i,
      /data:text\/html/i,
      /vbscript:/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(email)) {
        errors.push('Email contains suspicious content');
        this.logSecurityEvent('suspicious_email_validation', 'medium', { email });
        break;
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Emergency security lockdown - force logout and clear data
   */
  static async emergencyLockdown(reason: string): Promise<void> {
    try {
      // Log the emergency event
      await this.logSecurityEvent('emergency_security_lockdown', 'critical', {
        reason,
        lockdown_initiated: true,
        timestamp: new Date().toISOString()
      });

      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();

      // Force sign out
      await supabase.auth.signOut({ scope: 'global' });

      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Emergency lockdown failed:', error);
      // Force page reload as fallback
      window.location.reload();
    }
  }
}