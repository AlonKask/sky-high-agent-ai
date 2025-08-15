/**
 * Production Security Hardening Utilities
 * Implements enterprise-grade security measures for production deployment
 */

import { SECURITY_HEADERS } from './securityHeaders';

// Enhanced Content Security Policy for production
export const PRODUCTION_CSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Only for critical inline scripts
    "https://accounts.google.com",
    "https://apis.google.com"
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for dynamic styling
    "https://fonts.googleapis.com"
  ],
  'img-src': [
    "'self'",
    "data:",
    "https:",
    "blob:"
  ],
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com",
    "data:"
  ],
  'connect-src': [
    "'self'",
    "https://ekrwjfdypqzequovmvjn.supabase.co",
    "wss://ekrwjfdypqzequovmvjn.supabase.co",
    "https://accounts.google.com",
    "https://oauth2.googleapis.com"
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': [],
  'block-all-mixed-content': [],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'worker-src': ["'self'"],
  'manifest-src': ["'self'"],
  'media-src': ["'self'"]
};

// Security headers for different environments
export const getSecurityHeaders = (environment: 'development' | 'staging' | 'production') => {
  const baseHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
  };

  if (environment === 'production') {
    return {
      ...baseHeaders,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy': formatCSP(PRODUCTION_CSP),
      'Expect-CT': 'max-age=86400, enforce'
    };
  }

  return baseHeaders;
};

// Format CSP object into header string
const formatCSP = (csp: Record<string, string[]>): string => {
  return Object.entries(csp)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
};

// Advanced input sanitization
export class AdvancedInputSanitizer {
  private static readonly DANGEROUS_PATTERNS = [
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|;|\/\*|\*\/|xp_|sp_)/gi,
    
    // Command injection patterns
    /(\\||&|;|`|\$\(|$\{)/g,
    
    // Path traversal patterns
    /(\.\.\/|\.\.\\)/g,
    
    // LDAP injection patterns
    /(\*|\(|\)|\||&)/g
  ];

  private static readonly HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#96;',
    '=': '&#61;'
  };

  static sanitizeInput(input: string, options: {
    allowHtml?: boolean;
    maxLength?: number;
    stripDangerous?: boolean;
  } = {}): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // Enforce length limits
    if (options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Strip dangerous patterns
    if (options.stripDangerous !== false) {
      this.DANGEROUS_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
      });
    }

    // HTML encode if not allowing HTML
    if (!options.allowHtml) {
      sanitized = this.htmlEncode(sanitized);
    }

    return sanitized.trim();
  }

  static htmlEncode(input: string): string {
    return input.replace(/[&<>"'`=\/]/g, (char) => this.HTML_ENTITIES[char] || char);
  }

  static sanitizeEmail(email: string): string {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const sanitized = this.sanitizeInput(email, { maxLength: 254 });
    return emailRegex.test(sanitized) ? sanitized : '';
  }

  static sanitizePhoneNumber(phone: string): string {
    // Remove all non-numeric characters except + and spaces
    return phone.replace(/[^\\d\\s+-]/g, '').trim();
  }

  static sanitizeFileName(fileName: string): string {
    // Remove dangerous characters and limit length
    return fileName
      .replace(/[<>:"\/\\|?*\x00-\x1f]/g, '')
      .replace(/^\.+/, '')
      .substring(0, 255);
  }
}

// Production monitoring and alerting
export class ProductionSecurityMonitor {
  private static readonly ALERT_THRESHOLDS = {
    failedLogins: 5,
    suspiciousRequests: 10,
    dataAccessAnomalies: 3,
    errorRate: 0.1 // 10%
  };

  private static events: Array<{
    type: string;
    timestamp: number;
    details: any;
  }> = [];

  static logSecurityEvent(type: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    const event = {
      type,
      timestamp: Date.now(),
      details: {
        ...details,
        severity,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId()
      }
    };

    this.events.push(event);
    
    // Keep only recent events (last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.events = this.events.filter(e => e.timestamp > oneDayAgo);

    // Check for patterns and trigger alerts
    this.analyzeSecurityPatterns();

    // Send to monitoring service if critical
    if (severity === 'critical') {
      this.sendAlert(event);
    }
  }

  private static analyzeSecurityPatterns() {
    const recentEvents = this.events.filter(e => e.timestamp > Date.now() - (5 * 60 * 1000)); // Last 5 minutes
    
    // Analyze failed login patterns
    const failedLogins = recentEvents.filter(e => e.type === 'failed_login').length;
    if (failedLogins >= this.ALERT_THRESHOLDS.failedLogins) {
      this.sendAlert({
        type: 'pattern_detected',
        details: { pattern: 'excessive_failed_logins', count: failedLogins },
        timestamp: Date.now()
      });
    }

    // Analyze suspicious request patterns
    const suspiciousRequests = recentEvents.filter(e => e.type === 'suspicious_request').length;
    if (suspiciousRequests >= this.ALERT_THRESHOLDS.suspiciousRequests) {
      this.sendAlert({
        type: 'pattern_detected',
        details: { pattern: 'suspicious_activity_spike', count: suspiciousRequests },
        timestamp: Date.now()
      });
    }
  }

  private static sendAlert(event: any) {
    // In production, send to monitoring service (e.g., DataDog, Sentry, etc.)
    console.error('SECURITY ALERT:', event);
    
    // Could integrate with services like:
    // - Slack/Teams for real-time notifications
    // - PagerDuty for incident management
    // - SIEM systems for centralized logging
  }

  private static getSessionId(): string {
    return sessionStorage.getItem('sessionId') || 'anonymous';
  }

  static getSecurityMetrics() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentEvents = this.events.filter(e => e.timestamp > now - oneHour);

    return {
      totalEvents: this.events.length,
      recentEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(e => e.details.severity === 'critical').length,
      failedLogins: recentEvents.filter(e => e.type === 'failed_login').length,
      suspiciousActivity: recentEvents.filter(e => e.type === 'suspicious_request').length,
      lastEventTime: this.events.length > 0 ? new Date(this.events[this.events.length - 1].timestamp) : null
    };
  }
}

// Performance optimization with security considerations
export class SecurePerformanceOptimizer {
  private static readonly CACHE_SETTINGS = {
    // Cache durations for different content types
    static: 31536000, // 1 year for static assets
    api: 300, // 5 minutes for API responses
    dynamic: 60, // 1 minute for dynamic content
    sensitive: 0 // No caching for sensitive data
  };

  static getCacheHeaders(contentType: 'static' | 'api' | 'dynamic' | 'sensitive') {
    const maxAge = this.CACHE_SETTINGS[contentType];
    
    if (contentType === 'sensitive') {
      return {
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
    }

    return {
      'Cache-Control': `public, max-age=${maxAge}, immutable`,
      'ETag': this.generateETag(),
      'Last-Modified': new Date().toUTCString()
    };
  }

  private static generateETag(): string {
    return `"${Date.now().toString(36)}"`;
  }

  static implementResourceHints(): void {
    // DNS prefetch for external domains
    this.addResourceHint('dns-prefetch', 'https://accounts.google.com');
    this.addResourceHint('dns-prefetch', 'https://fonts.googleapis.com');
    
    // Preconnect to critical resources
    this.addResourceHint('preconnect', 'https://ekrwjfdypqzequovmvjn.supabase.co');
    
    // Preload critical resources
    this.addResourceHint('preload', '/fonts/inter.woff2', { as: 'font', type: 'font/woff2', crossorigin: 'anonymous' });
  }

  private static addResourceHint(rel: string, href: string, attrs: Record<string, string> = {}) {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    
    Object.entries(attrs).forEach(([key, value]) => {
      link.setAttribute(key, value);
    });
    
    document.head.appendChild(link);
  }
}

// Secure error handling for production
export class SecureErrorHandler {
  private static readonly SAFE_ERROR_MESSAGES: Record<string, string> = {
    'auth_failed': 'Authentication failed. Please check your credentials.',
    'access_denied': 'You do not have permission to access this resource.',
    'rate_limited': 'Too many requests. Please try again later.',
    'validation_failed': 'The provided data is invalid.',
    'server_error': 'An unexpected error occurred. Please try again.',
    'network_error': 'Connection failed. Please check your internet connection.'
  };

  static handleError(error: Error, context: string = 'unknown'): {
    userMessage: string;
    shouldLog: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
  } {
    // Determine error type and appropriate response
    const errorType = this.categorizeError(error);
    const userMessage = this.SAFE_ERROR_MESSAGES[errorType] || this.SAFE_ERROR_MESSAGES.server_error;
    
    // Determine if error should be logged and its severity
    const shouldLog = !['validation_failed', 'rate_limited'].includes(errorType);
    const severity = this.getErrorSeverity(errorType);

    // Log security-relevant errors
    if (shouldLog) {
      ProductionSecurityMonitor.logSecurityEvent('error_occurred', {
        errorType,
        context,
        message: error.message,
        stack: error.stack?.substring(0, 500) // Limit stack trace length
      }, severity);
    }

    return {
      userMessage,
      shouldLog,
      severity
    };
  }

  private static categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('auth') || message.includes('login') || message.includes('token')) {
      return 'auth_failed';
    }
    
    if (message.includes('permission') || message.includes('forbidden') || message.includes('unauthorized')) {
      return 'access_denied';
    }
    
    if (message.includes('rate') || message.includes('limit') || message.includes('throttle')) {
      return 'rate_limited';
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation_failed';
    }
    
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return 'network_error';
    }
    
    return 'server_error';
  }

  private static getErrorSeverity(errorType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorType) {
      case 'auth_failed':
      case 'access_denied':
        return 'high';
      case 'server_error':
        return 'critical';
      case 'network_error':
        return 'medium';
      default:
        return 'low';
    }
  }
}

// Initialize production security measures
export const initializeProductionSecurity = () => {
  // Set up error handlers
  window.addEventListener('error', (event) => {
    SecureErrorHandler.handleError(event.error, 'global_error_handler');
  });

  window.addEventListener('unhandledrejection', (event) => {
    SecureErrorHandler.handleError(new Error(event.reason), 'unhandled_promise_rejection');
  });

  // Implement resource hints
  SecurePerformanceOptimizer.implementResourceHints();

  // Log security initialization
  ProductionSecurityMonitor.logSecurityEvent('security_initialized', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    secureContext: window.isSecureContext
  }, 'low');
};

// All exports are already declared above with export keyword
