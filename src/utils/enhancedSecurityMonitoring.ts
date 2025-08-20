import { supabase } from "@/integrations/supabase/client";
import { logger } from './logger';

export interface SecurityViolation {
  type: 'critical' | 'high' | 'medium' | 'low';
  event: string;
  details: Record<string, any>;
  timestamp: Date;
}

class EnhancedSecurityMonitoring {
  private static instance: EnhancedSecurityMonitoring;
  private violations: SecurityViolation[] = [];
  private monitoring = false;

  private constructor() {}

  static getInstance(): EnhancedSecurityMonitoring {
    if (!EnhancedSecurityMonitoring.instance) {
      EnhancedSecurityMonitoring.instance = new EnhancedSecurityMonitoring();
    }
    return EnhancedSecurityMonitoring.instance;
  }

  // Start comprehensive security monitoring
  startMonitoring(): void {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.setupPerformanceMonitoring();
    this.setupNetworkMonitoring();
    this.setupInputMonitoring();
    this.setupAuthenticationMonitoring();
    this.setupDataAccessMonitoring();
    
    logger.info('Enhanced security monitoring started');
  }

  // Stop monitoring
  stopMonitoring(): void {
    this.monitoring = false;
    logger.info('Enhanced security monitoring stopped');
  }

  // Report security violation
  async reportViolation(violation: SecurityViolation): Promise<void> {
    this.violations.push(violation);
    
    try {
      await supabase.rpc('log_security_event', {
        p_event_type: violation.event,
        p_severity: violation.type,
        p_details: {
          ...violation.details,
          reported_by: 'enhanced_monitoring',
          client_timestamp: violation.timestamp.toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to report security violation:', error);
    }

    // Critical violations need immediate attention
    if (violation.type === 'critical') {
      this.handleCriticalViolation(violation);
    }
  }

  // Setup performance monitoring for suspicious activity
  private setupPerformanceMonitoring(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        // Monitor for unusually long tasks that might indicate malicious activity
        if (entry.duration > 1000) {
          this.reportViolation({
            type: 'medium',
            event: 'performance_anomaly',
            details: {
              task_name: entry.name,
              duration: entry.duration,
              type: entry.entryType
            },
            timestamp: new Date()
          });
        }
      });
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'longtask'] });
  }

  // Setup network monitoring for suspicious requests
  private setupNetworkMonitoring(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const [url, options] = args;
      const startTime = Date.now();
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        // Monitor for suspicious patterns
        if (duration > 10000) {
          this.reportViolation({
            type: 'medium',
            event: 'slow_network_request',
            details: {
              url: typeof url === 'string' ? url : url.toString(),
              duration,
              status: response.status
            },
            timestamp: new Date()
          });
        }
        
        // Monitor for error patterns that might indicate attacks
        if (response.status >= 400) {
          this.reportViolation({
            type: 'low',
            event: 'http_error_response',
            details: {
              url: typeof url === 'string' ? url : url.toString(),
              status: response.status,
              method: options?.method || 'GET'
            },
            timestamp: new Date()
          });
        }
        
        return response;
      } catch (error) {
        this.reportViolation({
          type: 'high',
          event: 'network_request_failed',
          details: {
            url: typeof url === 'string' ? url : url.toString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime
          },
          timestamp: new Date()
        });
        throw error;
      }
    };
  }

  // Setup input monitoring for XSS and injection attempts
  private setupInputMonitoring(): void {
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (!target.value) return;

      const suspiciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /data:text\/html/gi,
        /vbscript:/gi,
        /expression\s*\(/gi,
        /@import/gi,
        /url\s*\(/gi
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(target.value)) {
          this.reportViolation({
            type: 'critical',
            event: 'potential_xss_attempt',
            details: {
              input_type: target.type,
              input_name: target.name,
              input_id: target.id,
              pattern_matched: pattern.source,
              value_length: target.value.length
            },
            timestamp: new Date()
          });
          break;
        }
      }
    });
  }

  // Setup authentication monitoring
  private setupAuthenticationMonitoring(): void {
    let failedAttempts = 0;
    const maxFailedAttempts = 5;
    const timeWindow = 300000; // 5 minutes
    
    // Monitor for repeated authentication failures
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        failedAttempts = 0; // Reset on successful auth events
      } else if (event === 'PASSWORD_RECOVERY') {
        this.reportViolation({
          type: 'medium',
          event: 'password_recovery_attempt',
          details: {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
          },
          timestamp: new Date()
        });
      }
    });

    // Monitor console errors for auth failures
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ').toLowerCase();
      
      if (message.includes('auth') && (message.includes('failed') || message.includes('error'))) {
        failedAttempts++;
        
        if (failedAttempts >= maxFailedAttempts) {
          this.reportViolation({
            type: 'critical',
            event: 'repeated_auth_failures',
            details: {
              failed_attempts: failedAttempts,
              time_window_ms: timeWindow,
              last_error: args[0]
            },
            timestamp: new Date()
          });
        }
      }
      
      originalConsoleError.apply(console, args);
    };
  }

  // Setup data access monitoring
  private setupDataAccessMonitoring(): void {
    const sensitiveTableAccess = new Map<string, number>();
    const timeWindow = 60000; // 1 minute
    const maxAccessAttempts = 10;

    // Monitor Supabase queries
    const originalFrom = supabase.from;
    supabase.from = (...args) => {
      const tableName = args[0];
      
      // Track access to sensitive tables
      const sensitiveTables = ['clients', 'gmail_credentials', 'quotes', 'security_events'];
      
      if (sensitiveTables && sensitiveTables.includes(tableName)) {
        const currentTime = Date.now();
        const key = `${tableName}_${currentTime}`;
        
        const accessCount = (sensitiveTableAccess.get(tableName) || 0) + 1;
        sensitiveTableAccess.set(tableName, accessCount);
        
        // Clean up old entries
        setTimeout(() => {
          sensitiveTableAccess.delete(key);
        }, timeWindow);
        
        // Check for suspicious access patterns
        if (accessCount > maxAccessAttempts) {
          this.reportViolation({
            type: 'high',
            event: 'suspicious_data_access_pattern',
            details: {
              table_name: tableName,
              access_count: accessCount,
              time_window_ms: timeWindow
            },
            timestamp: new Date()
          });
        }
      }
      
      return originalFrom.apply(supabase, args);
    };
  }

  // Handle critical violations immediately
  private handleCriticalViolation(violation: SecurityViolation): void {
    // Log to console for immediate visibility
    console.error('🚨 CRITICAL SECURITY VIOLATION:', violation);
    
    // Could implement additional immediate responses here:
    // - Lock user session
    // - Disable certain features
    // - Show security warning to user
    // - Send immediate alerts to security team
  }

  // Get violation summary for security dashboard
  getViolationSummary(timeframe: 'hour' | 'day' | 'week' = 'day'): {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  } {
    const now = Date.now();
    const timeframes = {
      hour: 3600000,
      day: 86400000,
      week: 604800000
    };
    
    const cutoff = now - timeframes[timeframe];
    const recentViolations = this.violations.filter(v => v.timestamp.getTime() > cutoff);
    
    return recentViolations.reduce(
      (acc, violation) => {
        acc[violation.type]++;
        acc.total++;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
    );
  }

  // Clear violation history
  clearViolations(): void {
    this.violations = [];
  }
}

export const enhancedSecurityMonitoring = EnhancedSecurityMonitoring.getInstance();

// Auto-start monitoring when module loads
if (typeof window !== 'undefined') {
  enhancedSecurityMonitoring.startMonitoring();
}