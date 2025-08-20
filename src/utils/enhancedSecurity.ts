import { supabase } from "@/integrations/supabase/client";

// Track XSS attempts per IP for blocking
const xssAttemptTracker = new Map<string, { count: number; lastAttempt: number }>();

// Enhanced security logging and monitoring functions
export const logSecurityEvent = async (
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any> = {}
): Promise<boolean> => {
  try {
    // Enrich details with client context
    const enrichedDetails = {
      ...details,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      url: window.location.href,
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    // Use the consolidated database function
    const { error } = await supabase.rpc('log_security_event', {
      p_event_type: eventType,
      p_severity: severity,
      p_details: enrichedDetails
    });

    if (error) {
      console.error('Failed to log security event:', error);
      return false;
    }

    // Check for XSS attempts and implement blocking
    if (eventType.includes('xss') && ['high', 'critical'].includes(severity)) {
      // Try to get IP address from details or use detection
      const ipAddress = details.ip_address || details.client_ip || 'unknown';
      await handleXSSAttempt(ipAddress);
    }

    return true;
  } catch (error) {
    console.error('Security event logging failed:', error);
    return false;
  }
};

// Enhanced XSS attack handling with IP blocking
const handleXSSAttempt = async (ipAddress: string): Promise<void> => {
  if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === 'unknown') return;
  
  const now = Date.now();
  const tracker = xssAttemptTracker.get(ipAddress) || { count: 0, lastAttempt: 0 };
  
  // Reset count if last attempt was more than 1 hour ago
  if (now - tracker.lastAttempt > 3600000) {
    tracker.count = 0;
  }
  
  tracker.count++;
  tracker.lastAttempt = now;
  xssAttemptTracker.set(ipAddress, tracker);
  
  // Block IP after 3 XSS attempts within 1 hour
  if (tracker.count >= 3) {
    try {
      await supabase.rpc('block_suspicious_ip', {
        p_ip_address: ipAddress,
        p_block_duration: '1 hour'
      });
      
      await logSecurityEvent('ip_blocked_xss_attacks', 'critical', {
        ip_address: ipAddress,
        attempt_count: tracker.count,
        action: 'IP blocked for repeated XSS attempts'
      });
    } catch (error) {
      console.error('Failed to block suspicious IP:', error);
    }
  }
};

// Get real-time security metrics
export const getSecurityMetrics = async (timePeriod = '24 hours'): Promise<any> => {
  try {
    const { data, error } = await supabase.rpc('get_security_metrics', {
      time_period: timePeriod
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to fetch security metrics:', error);
    return null;
  }
};

// Check if current IP is blocked
export const checkIPBlocked = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const { ip } = await response.json();
    
    const { data, error } = await supabase.rpc('is_ip_blocked', {
      p_ip_address: ip
    });
    
    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Failed to check IP block status:', error);
    return false;
  }
};

// Enhanced input sanitization
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (!input) return '';
  
  return input
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '')
    .trim();
};

// Enhanced email validation with security checks
export const validateEmailSecurity = (email: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }
  
  // Length check
  if (email.length > 254) {
    errors.push('Email is too long');
  }
  
  // Format validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }
  
  // Security checks
  if (email.includes('..')) {
    errors.push('Email contains consecutive dots');
  }
  
  if (email.startsWith('.') || email.endsWith('.')) {
    errors.push('Email cannot start or end with a dot');
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /script/i,
    /javascript/i,
    /vbscript/i,
    /onload/i,
    /onerror/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(email)) {
      errors.push('Email contains suspicious content');
      logSecurityEvent('suspicious_email_attempt', 'medium', { email, pattern: pattern.source });
      break;
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

// Enhanced phone validation
export const validatePhoneSecurity = (phone: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!phone) {
    return { isValid: true, errors }; // Phone is optional
  }
  
  // Length check
  if (phone.length > 20) {
    errors.push('Phone number is too long');
  }
  
  // Format validation
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,20}$/;
  if (!phoneRegex.test(phone)) {
    errors.push('Invalid phone number format');
  }
  
  // Check for reasonable number of digits
  const digitCount = phone.replace(/\D/g, '').length;
  if (digitCount < 10 || digitCount > 15) {
    errors.push('Phone number must have 10-15 digits');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Rate limiting check
export const checkRateLimit = (key: string, maxRequests: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const storageKey = `rate_limit_${key}`;
  
  try {
    const stored = localStorage.getItem(storageKey);
    const data = stored ? JSON.parse(stored) : { count: 0, resetTime: now + windowMs };
    
    if (now > data.resetTime) {
      // Reset window
      data.count = 1;
      data.resetTime = now + windowMs;
    } else if (data.count >= maxRequests) {
      // Rate limit exceeded
      logSecurityEvent('rate_limit_exceeded', 'high', { key, count: data.count });
      return false;
    } else {
      // Increment count
      data.count++;
    }
    
    localStorage.setItem(storageKey, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow on error to avoid blocking legitimate users
  }
};

// Security headers validation
export const validateSecurityHeaders = async (): Promise<void> => {
  try {
    const response = await fetch(window.location.origin, { method: 'HEAD' });
    const headers = response.headers;
    
    const securityChecks = [
      { header: 'X-Frame-Options', expected: true },
      { header: 'X-Content-Type-Options', expected: true },
      { header: 'Referrer-Policy', expected: true },
      { header: 'Content-Security-Policy', expected: true }
    ];
    
    const missingHeaders = securityChecks
      .filter(check => !headers.has(check.header))
      .map(check => check.header);
    
    if (missingHeaders.length > 0) {
      logSecurityEvent('missing_security_headers', 'medium', { missingHeaders });
    }
  } catch (error) {
    console.error('Security headers validation error:', error);
  }
};

// Initialize security monitoring
export const initSecurityMonitoring = (): void => {
  // Check for security headers
  validateSecurityHeaders();
  
  // Monitor for suspicious activity
  let suspiciousActivityCount = 0;
  const originalConsoleError = console.error;
  
  console.error = (...args) => {
    const message = args.join(' ').toLowerCase();
    
    if (message.includes('unauthorized') || 
        message.includes('forbidden') || 
        message.includes('access denied') ||
        message.includes('permission denied')) {
      suspiciousActivityCount++;
      
      if (suspiciousActivityCount >= 3) {
        logSecurityEvent('repeated_unauthorized_attempts', 'high', {
          count: suspiciousActivityCount,
          lastError: args[0]
        });
      }
    }
    
    originalConsoleError.apply(console, args);
  };
  
  // Enhanced XSS monitoring for innerHTML
  const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (originalInnerHTML) {
    Object.defineProperty(Element.prototype, 'innerHTML', {
      set: function(value: string) {
        if (typeof value === 'string' && 
            (value.includes('<script') || 
             value.includes('javascript:') || 
             value.includes('onload=') ||
             value.includes('onerror='))) {
          logSecurityEvent('potential_xss_attempt', 'critical', {
            element: this.tagName,
            content: value.substring(0, 100),
            location: window.location.href
          });
        }
        
        if (originalInnerHTML.set) {
          originalInnerHTML.set.call(this, value);
        }
      },
      get: originalInnerHTML.get,
      configurable: true
    });
  }
};