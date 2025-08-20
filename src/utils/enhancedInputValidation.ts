import DOMPurify from 'dompurify';
import { z } from 'zod';
import { logSecurityEvent } from '@/utils/enhancedSecurity';

// Enhanced XSS detection patterns
const XSS_PATTERNS = [
  /<script[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[\s\S]*?<\/iframe>/gi,
  /<object[\s\S]*?<\/object>/gi,
  /<embed[\s\S]*?<\/embed>/gi,
  /<link[\s\S]*?>/gi,
  /<meta[\s\S]*?>/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /expression\s*\(/gi,
  /@import/gi,
  /document\.cookie/gi,
  /document\.write/gi,
  /eval\s*\(/gi,
  /Function\s*\(/gi
];

// SQL Injection patterns
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
  /(\b(UNION|WHERE|ORDER BY|GROUP BY|HAVING)\b)/gi,
  /(--|\#|\/\*|\*\/)/g,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /(\'\s*(OR|AND)\s+\'\w+\')/gi,
  /(\bCONCAT\b)/gi,
  /(\bCHAR\b)/gi
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.[\\\/]/g,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,
  /\.\.%2f/gi,
  /\.\.%5c/gi
];

interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  threats: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class EnhancedInputValidator {
  private static instance: EnhancedInputValidator;

  static getInstance(): EnhancedInputValidator {
    if (!EnhancedInputValidator.instance) {
      EnhancedInputValidator.instance = new EnhancedInputValidator();
    }
    return EnhancedInputValidator.instance;
  }

  /**
   * Comprehensive input validation and sanitization
   */
  validateAndSanitize(input: string, context: string = 'general'): ValidationResult {
    const threats: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for XSS attempts
    const xssThreats = this.detectXSS(input);
    if (xssThreats.length > 0) {
      threats.push(...xssThreats.map(t => `XSS: ${t}`));
      riskLevel = 'high';
    }

    // Check for SQL injection
    const sqlThreats = this.detectSQLInjection(input);
    if (sqlThreats.length > 0) {
      threats.push(...sqlThreats.map(t => `SQL Injection: ${t}`));
      riskLevel = 'critical';
    }

    // Check for path traversal
    const pathThreats = this.detectPathTraversal(input);
    if (pathThreats.length > 0) {
      threats.push(...pathThreats.map(t => `Path Traversal: ${t}`));
      riskLevel = 'high';
    }

    // Sanitize input
    const sanitized = this.sanitizeInput(input, context);

    // Log security events for medium+ threats
    if (threats.length > 0 && ['medium', 'high', 'critical'].includes(riskLevel)) {
      logSecurityEvent('malicious_input_detected', riskLevel, {
        context,
        threats,
        input_length: input.length,
        sanitized_length: sanitized.length,
        input_preview: input.substring(0, 100)
      });
    }

    return {
      isValid: threats.length === 0,
      sanitized,
      threats,
      riskLevel
    };
  }

  private detectXSS(input: string): string[] {
    const detected: string[] = [];
    
    XSS_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(input)) {
        detected.push(`Pattern ${index + 1}`);
      }
    });

    return detected;
  }

  private detectSQLInjection(input: string): string[] {
    const detected: string[] = [];
    
    SQL_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(input)) {
        detected.push(`SQL Pattern ${index + 1}`);
      }
    });

    return detected;
  }

  private detectPathTraversal(input: string): string[] {
    const detected: string[] = [];
    
    PATH_TRAVERSAL_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(input)) {
        detected.push(`Path Pattern ${index + 1}`);
      }
    });

    return detected;
  }

  private sanitizeInput(input: string, context: string): string {
    // First pass: DOMPurify for HTML/XSS
    let sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });

    // Second pass: Remove suspicious characters and patterns
    sanitized = sanitized
      .replace(/[<>'"]/g, '') // Remove dangerous chars
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .trim();

    // Context-specific sanitization
    switch (context) {
      case 'email':
        sanitized = sanitized.replace(/[^\w@.-]/g, '');
        break;
      case 'phone':
        sanitized = sanitized.replace(/[^\d+()-.\s]/g, '');
        break;
      case 'name':
        sanitized = sanitized.replace(/[^a-zA-Z\s'-]/g, '');
        break;
      case 'alphanumeric':
        sanitized = sanitized.replace(/[^\w\s]/g, '');
        break;
    }

    return sanitized;
  }

  /**
   * Enhanced Zod schemas with security validation
   */
  createSecureEmailSchema() {
    return z.string()
      .min(1, 'Email is required')
      .max(254, 'Email too long')
      .refine((email) => {
        const result = this.validateAndSanitize(email, 'email');
        return result.isValid && result.riskLevel === 'low';
      }, 'Invalid or potentially dangerous email format')
      .refine((email) => {
        // Additional email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      }, 'Invalid email format');
  }

  createSecureTextSchema(maxLength: number = 500, context: string = 'general') {
    return z.string()
      .max(maxLength, `Text too long (max ${maxLength} characters)`)
      .refine((text) => {
        const result = this.validateAndSanitize(text, context);
        return result.riskLevel !== 'critical';
      }, 'Input contains potentially dangerous content')
      .transform((text) => {
        const result = this.validateAndSanitize(text, context);
        return result.sanitized;
      });
  }

  createSecureNameSchema() {
    return this.createSecureTextSchema(100, 'name')
      .refine((name) => {
        return /^[a-zA-Z\s'-]+$/.test(name);
      }, 'Name can only contain letters, spaces, hyphens, and apostrophes');
  }

  createSecurePhoneSchema() {
    return this.createSecureTextSchema(20, 'phone')
      .refine((phone) => {
        return /^[\d+()-.\s]+$/.test(phone);
      }, 'Phone can only contain digits, +, (), -, ., and spaces');
  }
}

// Export singleton instance
export const enhancedInputValidator = EnhancedInputValidator.getInstance();

// Export enhanced schemas
export const secureSchemas = {
  email: enhancedInputValidator.createSecureEmailSchema(),
  name: enhancedInputValidator.createSecureNameSchema(),
  phone: enhancedInputValidator.createSecurePhoneSchema(),
  text: (maxLength?: number, context?: string) => 
    enhancedInputValidator.createSecureTextSchema(maxLength, context),
  alphanumeric: enhancedInputValidator.createSecureTextSchema(500, 'alphanumeric')
};