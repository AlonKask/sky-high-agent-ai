import { useState, useCallback } from 'react';
import { validateAndSanitize, maskSensitiveData } from '@/utils/sanitization';
import { secureLogger } from '@/utils/secureLogger';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, string>;
}

export class SecureInputValidator {
  private static instance: SecureInputValidator;
  private suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ];

  static getInstance(): SecureInputValidator {
    if (!SecureInputValidator.instance) {
      SecureInputValidator.instance = new SecureInputValidator();
    }
    return SecureInputValidator.instance;
  }

  private detectSuspiciousContent(input: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(input));
  }

  validateInput(
    data: Record<string, string>, 
    rules: ValidationRules
  ): ValidationResult {
    const errors: Record<string, string> = {};
    const sanitizedData: Record<string, string> = {};
    let suspiciousInputDetected = false;

    for (const [field, value] of Object.entries(data)) {
      const rule = rules[field];
      if (!rule) continue;

      // Check for suspicious content
      if (this.detectSuspiciousContent(value)) {
        suspiciousInputDetected = true;
        secureLogger.error('Suspicious input detected', {
          field,
          value: maskSensitiveData(value, 4),
          patterns: this.suspiciousPatterns.filter(p => p.test(value)).map(p => p.toString())
        });
        errors[field] = 'Invalid input detected';
        continue;
      }

      // Required validation
      if (rule.required && (!value || value.trim() === '')) {
        errors[field] = 'This field is required';
        continue;
      }

      // Skip further validation if field is empty and not required
      if (!value && !rule.required) {
        sanitizedData[field] = '';
        continue;
      }

      // Length validation
      if (rule.minLength && value.length < rule.minLength) {
        errors[field] = `Must be at least ${rule.minLength} characters`;
        continue;
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors[field] = `Must not exceed ${rule.maxLength} characters`;
        continue;
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[field] = 'Invalid format';
        continue;
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value);
        if (customError) {
          errors[field] = customError;
          continue;
        }
      }

      // Sanitize the input
      sanitizedData[field] = validateAndSanitize(value, rule.maxLength || 1000);
    }

    // Log security event if suspicious input was detected
    if (suspiciousInputDetected) {
      // This would typically trigger additional security measures
      secureLogger.error('Security threat detected in user input', {
        fieldCount: Object.keys(data).length,
        suspiciousFields: Object.keys(errors).length
      });
    }

    return {
      isValid: Object.keys(errors).length === 0 && !suspiciousInputDetected,
      errors,
      sanitizedData
    };
  }

  // Predefined validation rules for common use cases
  static readonly RULES = {
    EMAIL: {
      required: true,
      maxLength: 254,
      pattern: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      custom: (value: string) => {
        if (value.includes('..')) return 'Invalid email format';
        return null;
      }
    },
    PHONE: {
      required: false,
      maxLength: 20,
      pattern: /^\+?[\d\s\-\(\)]{10,20}$/,
      custom: (value: string) => {
        const digitCount = value.replace(/\D/g, '').length;
        if (digitCount < 10 || digitCount > 15) {
          return 'Phone number must contain 10-15 digits';
        }
        return null;
      }
    },
    NAME: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z\s\-'\.]+$/,
      custom: (value: string) => {
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return null;
      }
    },
    GENERAL_TEXT: {
      required: false,
      maxLength: 1000
    },
    SECURE_TEXT: {
      required: false,
      maxLength: 500,
      custom: (value: string) => {
        // Extra security for sensitive fields
        if (/[<>\"'&]/.test(value)) {
          return 'Special characters not allowed';
        }
        return null;
      }
    }
  };
}

// React hook for easy use in components
export const useSecureValidation = () => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const validator = SecureInputValidator.getInstance();

  const validateForm = useCallback((
    data: Record<string, string>, 
    rules: ValidationRules
  ): ValidationResult => {
    const result = validator.validateInput(data, rules);
    setValidationErrors(result.errors);
    return result;
  }, [validator]);

  const clearErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  const getFieldError = useCallback((field: string): string | undefined => {
    return validationErrors[field];
  }, [validationErrors]);

  return {
    validateForm,
    validationErrors,
    clearErrors,
    getFieldError,
    hasErrors: Object.keys(validationErrors).length > 0
  };
};