import { supabase } from "@/integrations/supabase/client";

// Enhanced security logging and monitoring functions
export const logSecurityEvent = async (
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any> = {}
) => {
  try {
    const { error } = await supabase
      .from('security_events')
      .insert({
        event_type: eventType,
        severity,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          url: window.location.href
        }
      });
    
    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (error) {
    console.error('Security logging error:', error);
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
  
  // Monitor for potential XSS attempts
  const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (originalInnerHTML) {
    Object.defineProperty(Element.prototype, 'innerHTML', {
      set: function(value: string) {
        if (typeof value === 'string' && 
            (value.includes('<script') || 
             value.includes('javascript:') || 
             value.includes('onload='))) {
          logSecurityEvent('potential_xss_attempt', 'critical', {
            element: this.tagName,
            content: value.substring(0, 100)
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