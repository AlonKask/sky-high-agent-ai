import { z } from 'zod';
import { logSecurityEvent } from './enhancedSecurity';

/**
 * Enhanced input validation with security monitoring
 * Provides comprehensive validation with threat detection
 */

// Enhanced email validation with security checks
export const secureEmailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(254, 'Email too long')
  .refine((email) => {
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /script/i,
      /javascript/i,
      /vbscript/i,
      /onload/i,
      /onerror/i,
      /<.*>/
    ];
    
    const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(email));
    
    if (hasSuspiciousContent) {
      logSecurityEvent('suspicious_email_input', 'medium', { 
        email: email.substring(0, 50), 
        detected_patterns: 'malicious_content' 
      });
      return false;
    }
    
    return true;
  }, 'Email contains suspicious content');

// Enhanced text validation with XSS protection
export const secureTextSchema = z.string()
  .max(10000, 'Text too long')
  .transform((text) => {
    if (!text) return '';
    
    // Remove potential XSS vectors
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/vbscript:/gi, '')
      .trim();
  });

// Client data validation with enhanced security
export const secureClientSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .transform(val => secureTextSchema.parse(val)),
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .transform(val => secureTextSchema.parse(val)),
  email: secureEmailSchema,
  phone: z.string()
    .max(20, 'Phone number too long')
    .regex(/^[\+]?[\d\s\-\(\)]*$/, 'Invalid phone format')
    .optional()
    .transform(val => val ? secureTextSchema.parse(val) : undefined),
  company: z.string()
    .max(100, 'Company name too long')
    .optional()
    .transform(val => val ? secureTextSchema.parse(val) : undefined)
});

// Enhanced request validation
export const secureRequestSchema = z.object({
  origin: z.string()
    .min(3, 'Origin is required')
    .max(100, 'Origin too long')
    .transform(val => secureTextSchema.parse(val)),
  destination: z.string()
    .min(3, 'Destination is required')
    .max(100, 'Destination too long')
    .transform(val => secureTextSchema.parse(val)),
  departure_date: z.string()
    .refine(date => {
      const parsed = Date.parse(date);
      if (isNaN(parsed)) return false;
      
      // Security check: prevent far future dates that might cause issues
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2);
      
      return new Date(parsed) <= maxFutureDate;
    }, 'Invalid or unrealistic departure date'),
  passengers: z.number()
    .min(1, 'At least 1 passenger required')
    .max(9, 'Maximum 9 passengers allowed')
});

// Rate limiting with progressive restrictions
const rateLimitStore = new Map<string, { count: number; resetTime: number; blocked?: boolean }>();

export const enhancedRateLimit = (
  key: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000,
  blockDuration: number = 300000 // 5 minutes
): boolean => {
  const now = Date.now();
  const stored = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
  
  // Check if currently blocked
  if (stored.blocked && stored.resetTime > now) {
    return false;
  }
  
  // Reset window if expired
  if (now > stored.resetTime) {
    stored.count = 1;
    stored.resetTime = now + windowMs;
    stored.blocked = false;
  } else {
    stored.count++;
  }
  
  // Block if exceeded limits
  if (stored.count > maxRequests) {
    stored.blocked = true;
    stored.resetTime = now + blockDuration;
    
    logSecurityEvent('rate_limit_exceeded', 'high', { 
      key: key.substring(0, 20), 
      count: stored.count,
      blocked_until: new Date(stored.resetTime).toISOString()
    });
    
    return false;
  }
  
  rateLimitStore.set(key, stored);
  return true;
};

// Secure form validation wrapper
export const validateSecureForm = <T>(
  schema: z.ZodSchema<T>, 
  data: unknown,
  context?: string
): { success: boolean; data?: T; errors?: string[] } => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      
      // Log validation failures for security monitoring
      logSecurityEvent('form_validation_failure', 'low', {
        context,
        error_count: errors.length,
        error_types: error.errors.map(e => e.code)
      });
      
      return { success: false, errors };
    }
    
    return { success: false, errors: ['Validation failed'] };
  }
};

// SQL injection detection
export const detectSQLInjection = (input: string): boolean => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /('|(--)|(\|)|(%7C))/i,
    /(;|\x00)/i
  ];
  
  const hasSQLPattern = sqlPatterns.some(pattern => pattern.test(input));
  
  if (hasSQLPattern) {
    logSecurityEvent('sql_injection_attempt', 'critical', {
      input_sample: input.substring(0, 100),
      detection_method: 'pattern_matching'
    });
  }
  
  return hasSQLPattern;
};

// XSS detection
export const detectXSS = (input: string): boolean => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  const hasXSSPattern = xssPatterns.some(pattern => pattern.test(input));
  
  if (hasXSSPattern) {
    logSecurityEvent('xss_attempt', 'critical', {
      input_sample: input.substring(0, 100),
      detection_method: 'pattern_matching'
    });
  }
  
  return hasXSSPattern;
};

// Comprehensive security validation
export const securityValidateInput = (input: string, context?: string): boolean => {
  if (detectSQLInjection(input) || detectXSS(input)) {
    logSecurityEvent('malicious_input_blocked', 'high', {
      context,
      input_length: input.length,
      threat_detected: true
    });
    return false;
  }
  
  return true;
};