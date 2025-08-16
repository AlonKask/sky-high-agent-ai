// Enhanced Security Service for handling failed events and monitoring
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "./enhancedSecurity";

export class SecurityEnhancementService {
  private static instance: SecurityEnhancementService;
  private retryIntervalId: number | null = null;
  private isRetrying = false;

  static getInstance(): SecurityEnhancementService {
    if (!SecurityEnhancementService.instance) {
      SecurityEnhancementService.instance = new SecurityEnhancementService();
    }
    return SecurityEnhancementService.instance;
  }

  // Initialize security monitoring and retry mechanisms
  init() {
    this.startFailedEventRetry();
    this.initializeSecurityMonitoring();
    this.setupErrorHandlers();
  }

  // Retry failed security events from localStorage
  private startFailedEventRetry() {
    if (this.retryIntervalId) return;

    this.retryIntervalId = window.setInterval(async () => {
      if (this.isRetrying) return;
      
      try {
        this.isRetrying = true;
        await this.retryFailedEvents();
      } catch (error) {
        console.error('Error during failed event retry:', error);
      } finally {
        this.isRetrying = false;
      }
    }, 30000); // Retry every 30 seconds
  }

  private async retryFailedEvents() {
    if (typeof localStorage === 'undefined') return;

    try {
      const failedEventsJson = localStorage.getItem('failed_security_events');
      if (!failedEventsJson) return;

      const failedEvents = JSON.parse(failedEventsJson);
      if (!Array.isArray(failedEvents) || failedEvents.length === 0) return;

      const retriedEvents: any[] = [];
      const stillFailedEvents: any[] = [];

      for (const event of failedEvents) {
        try {
          // Attempt to log the event again
          const { error } = await supabase
            .from('security_events')
            .insert({
              event_type: event.eventType,
              severity: event.severity,
              details: {
                ...event.details,
                original_failed_at: event.failedAt,
                retry_attempt: true,
                retried_at: new Date().toISOString()
              }
            });

          if (error) {
            stillFailedEvents.push(event);
          } else {
            retriedEvents.push(event);
          }
        } catch (retryError) {
          stillFailedEvents.push(event);
        }
      }

      // Update localStorage with events that still failed
      if (stillFailedEvents.length > 0) {
        localStorage.setItem('failed_security_events', JSON.stringify(stillFailedEvents));
      } else {
        localStorage.removeItem('failed_security_events');
      }

      if (retriedEvents.length > 0) {
        console.log(`✅ Successfully retried ${retriedEvents.length} failed security events`);
      }
    } catch (error) {
      console.error('Error processing failed security events:', error);
    }
  }

  // Enhanced security monitoring
  private initializeSecurityMonitoring() {
    // Monitor for suspicious console activity
    this.monitorConsoleErrors();
    
    // Monitor for potential memory attacks
    this.monitorMemoryUsage();
    
    // Monitor for suspicious network activity
    this.monitorNetworkActivity();
    
    // Monitor for CSP violations
    this.monitorCSPViolations();
  }

  private monitorConsoleErrors() {
    const originalError = console.error;
    let errorCount = 0;
    const errorWindow = 60000; // 1 minute
    let windowStart = Date.now();

    console.error = (...args) => {
      const now = Date.now();
      
      // Reset window if needed
      if (now - windowStart > errorWindow) {
        errorCount = 0;
        windowStart = now;
      }
      
      errorCount++;
      
      // Check for suspicious patterns
      const message = args.join(' ').toLowerCase();
      if (message.includes('unauthorized') || 
          message.includes('403') || 
          message.includes('access denied') ||
          message.includes('permission denied')) {
        
        logSecurityEvent('suspicious_console_error', 'medium', {
          error_message: args[0],
          error_count_in_window: errorCount,
          pattern_type: 'unauthorized_access'
        });
      }
      
      // High error count indicates potential attack
      if (errorCount > 20) {
        logSecurityEvent('high_error_rate_detected', 'high', {
          error_count: errorCount,
          window_duration: errorWindow,
          last_error: args[0]
        });
      }
      
      originalError.apply(console, args);
    };
  }

  private monitorMemoryUsage() {
    if ('performance' in window && 'memory' in (performance as any)) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const totalMB = memory.totalJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
        
        // Alert if memory usage is very high
        if (usedMB > limitMB * 0.9) {
          logSecurityEvent('high_memory_usage_detected', 'medium', {
            used_mb: usedMB,
            total_mb: totalMB,
            limit_mb: limitMB,
            usage_percentage: (usedMB / limitMB) * 100
          });
        }
      };
      
      setInterval(checkMemory, 60000); // Check every minute
    }
  }

  private monitorNetworkActivity() {
    // Track failed network requests
    const originalFetch = window.fetch;
    let failedRequestCount = 0;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok && response.status === 403) {
          failedRequestCount++;
          
          if (failedRequestCount > 5) {
            logSecurityEvent('multiple_403_requests', 'high', {
              failed_count: failedRequestCount,
              url: typeof args[0] === 'string' ? args[0] : 'complex_request',
              status: response.status
            });
          }
        }
        
        return response;
      } catch (error) {
        failedRequestCount++;
        
        if (failedRequestCount > 10) {
          logSecurityEvent('multiple_network_failures', 'medium', {
            failed_count: failedRequestCount,
            error_message: error instanceof Error ? error.message : 'unknown'
          });
        }
        
        throw error;
      }
    };
  }

  private monitorCSPViolations() {
    document.addEventListener('securitypolicyviolation', (event) => {
      logSecurityEvent('csp_violation_detected', 'high', {
        violated_directive: event.violatedDirective,
        blocked_uri: event.blockedURI,
        document_uri: event.documentURI,
        original_policy: event.originalPolicy,
        source_file: event.sourceFile,
        line_number: event.lineNumber
      });
    });
  }

  private setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      logSecurityEvent('javascript_error', 'low', {
        message: event.message,
        filename: event.filename,
        line_number: event.lineno,
        column_number: event.colno,
        stack: event.error?.stack
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      logSecurityEvent('unhandled_promise_rejection', 'medium', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });
  }

  // Clean up resources
  destroy() {
    if (this.retryIntervalId) {
      clearInterval(this.retryIntervalId);
      this.retryIntervalId = null;
    }
  }
}

// Initialize the service
export const securityService = SecurityEnhancementService.getInstance();