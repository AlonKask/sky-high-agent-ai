import { sanitizeInput, validateEmailSecurity, validatePhoneSecurity } from './enhancedSecurity';
import { enhancedSecurityMonitoring } from './enhancedSecurityMonitoring';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedValue?: string;
}

export interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowHtml?: boolean;
  allowSpecialChars?: boolean;
  pattern?: RegExp;
  customValidator?: (value: string) => boolean;
}

class EnhancedInputValidator {
  private static instance: EnhancedInputValidator;
  private suspiciousPatterns: RegExp[] = [
    // XSS patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /expression\s*\(/gi,
    
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)|(\-\-)|(\;)/gi,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)|(\'\s*(OR|AND)\s+\'.+\')/gi,
    
    // Command injection patterns
    /(\||&|;|\$\(|\`)/gi,
    /(exec|eval|system|shell_exec|passthru)/gi,
    
    // Path traversal patterns
    /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\)/gi,
    
    // LDAP injection patterns
    /(\*|\(|\)|\\|\/|\!|&|\|)/gi,
    
    // NoSQL injection patterns
    /(\$where|\$ne|\$regex|\$or|\$and)/gi
  ];

  private constructor() {}

  static getInstance(): EnhancedInputValidator {
    if (!EnhancedInputValidator.instance) {
      EnhancedInputValidator.instance = new EnhancedInputValidator();
    }
    return EnhancedInputValidator.instance;
  }

  // Enhanced email validation with security checks
  validateEmail(email: string): ValidationResult {
    const result = validateEmailSecurity(email);
    
    if (!result.isValid && result.errors.some(e => e.includes('suspicious'))) {
      enhancedSecurityMonitoring.reportViolation({
        type: 'critical',
        event: 'suspicious_email_input',
        details: {
          email: email.substring(0, 50) + '...',
          errors: result.errors
        },
        timestamp: new Date()
      });
    }

    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: [],
      sanitizedValue: result.isValid ? email : undefined
    };
  }

  // Enhanced phone validation with security checks
  validatePhone(phone: string): ValidationResult {
    const result = validatePhoneSecurity(phone);
    
    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: [],
      sanitizedValue: result.isValid ? phone : undefined
    };
  }

  // Enhanced general input validation
  validateInput(
    value: string, 
    fieldName: string, 
    options: ValidationOptions = {}
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!value && value !== '') {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors, warnings };
    }

    // Length validation
    if (options.minLength && value.length < options.minLength) {
      errors.push(`${fieldName} must be at least ${options.minLength} characters`);
    }

    if (options.maxLength && value.length > options.maxLength) {
      errors.push(`${fieldName} must not exceed ${options.maxLength} characters`);
    }

    // Pattern validation
    if (options.pattern && !options.pattern.test(value)) {
      errors.push(`${fieldName} format is invalid`);
    }

    // Custom validation
    if (options.customValidator && !options.customValidator(value)) {
      errors.push(`${fieldName} failed custom validation`);
    }

    // Security validation
    const securityResult = this.checkForSecurityThreats(value, fieldName);
    if (!securityResult.isValid) {
      errors.push(...securityResult.errors);
      
      // Report high-severity security threats
      if (securityResult.threatLevel === 'critical' || securityResult.threatLevel === 'high') {
        enhancedSecurityMonitoring.reportViolation({
          type: securityResult.threatLevel,
          event: 'malicious_input_detected',
          details: {
            field_name: fieldName,
            threat_type: securityResult.threatType,
            input_length: value.length,
            patterns_matched: securityResult.patternsMatched
          },
          timestamp: new Date()
        });
      }
    }

    // Sanitize the input
    let sanitizedValue = value;
    if (!options.allowHtml) {
      sanitizedValue = sanitizeInput(value, options.maxLength || 1000);
    }

    // Check if sanitization changed the input significantly
    if (sanitizedValue.length < value.length * 0.8) {
      warnings.push(`${fieldName} contained potentially unsafe content that was removed`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue
    };
  }

  // Check for security threats in input
  private checkForSecurityThreats(value: string, fieldName: string): {
    isValid: boolean;
    errors: string[];
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    threatType: string;
    patternsMatched: string[];
  } {
    const errors: string[] = [];
    const patternsMatched: string[] = [];
    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let threatType = 'none';

    // Check for XSS patterns
    const xssPatterns = this.suspiciousPatterns.slice(0, 6);
    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        errors.push(`${fieldName} contains potential XSS content`);
        patternsMatched.push(pattern.source);
        threatLevel = 'critical';
        threatType = 'xss';
        break;
      }
    }

    // Check for SQL injection patterns
    const sqlPatterns = this.suspiciousPatterns.slice(6, 8);
    for (const pattern of sqlPatterns) {
      if (pattern.test(value)) {
        errors.push(`${fieldName} contains potential SQL injection content`);
        patternsMatched.push(pattern.source);
        threatLevel = 'critical';
        threatType = 'sql_injection';
        break;
      }
    }

    // Check for command injection patterns
    const cmdPatterns = this.suspiciousPatterns.slice(8, 10);
    for (const pattern of cmdPatterns) {
      if (pattern.test(value)) {
        errors.push(`${fieldName} contains potential command injection content`);
        patternsMatched.push(pattern.source);
        threatLevel = 'high';
        threatType = 'command_injection';
        break;
      }
    }

    // Check for path traversal patterns
    const pathPatterns = this.suspiciousPatterns.slice(10, 11);
    for (const pattern of pathPatterns) {
      if (pattern.test(value)) {
        errors.push(`${fieldName} contains potential path traversal content`);
        patternsMatched.push(pattern.source);
        threatLevel = 'high';
        threatType = 'path_traversal';
        break;
      }
    }

    // Check for excessive length (potential buffer overflow)
    if (value.length > 10000) {
      errors.push(`${fieldName} is suspiciously long`);
      threatLevel = 'medium';
      threatType = 'buffer_overflow';
    }

    // Check for unusual characters or encoding
    const unusualChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g;
    if (unusualChars.test(value)) {
      errors.push(`${fieldName} contains unusual characters`);
      threatLevel = 'medium';
      threatType = 'encoding_attack';
    }

    return {
      isValid: errors.length === 0,
      errors,
      threatLevel,
      threatType,
      patternsMatched
    };
  }

  // Validate file upload security
  validateFileUpload(file: File): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not allowed');
      
      enhancedSecurityMonitoring.reportViolation({
        type: 'high',
        event: 'unauthorized_file_upload',
        details: {
          file_type: file.type,
          file_name: file.name,
          file_size: file.size
        },
        timestamp: new Date()
      });
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('File size too large (max 10MB)');
    }

    // Check for suspicious file names
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar', '.com', '.pif'];
    const lowerFileName = file.name.toLowerCase();
    
    for (const ext of suspiciousExtensions) {
      if (lowerFileName.endsWith(ext)) {
        errors.push('File type not allowed for security reasons');
        
        enhancedSecurityMonitoring.reportViolation({
          type: 'critical',
          event: 'malicious_file_upload_attempt',
          details: {
            file_name: file.name,
            file_extension: ext,
            file_size: file.size
          },
          timestamp: new Date()
        });
        break;
      }
    }

    // Check for double extensions
    if ((file.name.match(/\./g) || []).length > 1) {
      warnings.push('File has multiple extensions - please verify this is intended');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Validate password strength
  validatePassword(password: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        warnings.push('Password contains common patterns - consider using a stronger password');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: password
    };
  }
}

export const enhancedInputValidator = EnhancedInputValidator.getInstance();