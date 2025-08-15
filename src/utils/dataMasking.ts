/**
 * Data Masking Utilities for Sensitive Information
 * Provides client-side data masking to complement server-side security
 */

export type SensitiveFieldType = 'ssn' | 'passport' | 'email' | 'phone' | 'payment' | 'general';

export interface MaskingOptions {
  showLength?: boolean;
  preserveFormat?: boolean;
  customMask?: string;
}

/**
 * Masks sensitive data based on field type
 */
export const maskSensitiveData = (
  data: string | null | undefined,
  fieldType: SensitiveFieldType = 'general',
  options: MaskingOptions = {}
): string => {
  if (!data || data.trim().length === 0) {
    return data || '';
  }

  const { showLength = false, preserveFormat = true, customMask = '*' } = options;

  switch (fieldType) {
    case 'ssn':
      // Mask SSN: XXX-XX-1234
      if (preserveFormat && data.includes('-')) {
        return data.replace(/(\d{3})-?(\d{2})-?(\d{4})/, 'XXX-XX-$3');
      }
      return data.replace(/(\d+)(\d{4})$/, customMask.repeat(data.length - 4) + '$2');

    case 'passport':
      // Show last 4 characters
      if (data.length <= 4) return customMask.repeat(data.length);
      return customMask.repeat(data.length - 4) + data.slice(-4);

    case 'email':
      // Mask email: j***@example.com
      const emailMatch = data.match(/^(.)(.*?)(@.+)$/);
      if (emailMatch) {
        const [, first, middle, domain] = emailMatch;
        return first + customMask.repeat(Math.max(middle.length, 1)) + domain;
      }
      return data;

    case 'phone':
      // Show last 4 digits
      if (data.length <= 4) return customMask.repeat(data.length);
      return customMask.repeat(data.length - 4) + data.slice(-4);

    case 'payment':
      // Mask payment info: show last 4 characters
      if (data.length <= 4) return customMask.repeat(data.length);
      return customMask.repeat(data.length - 4) + data.slice(-4);

    case 'general':
    default:
      // General masking: show first and last character if length > 3
      if (data.length <= 3) {
        return customMask.repeat(data.length);
      }
      return data[0] + customMask.repeat(data.length - 2) + data[data.length - 1];
  }
};

/**
 * Determines if data should be masked based on user role and data classification
 */
export const shouldMaskData = (
  userRole: string | null,
  dataClassification: string = 'general',
  fieldType: SensitiveFieldType = 'general'
): boolean => {
  // Admin can see everything
  if (userRole === 'admin') return false;

  // Highly sensitive data should always be masked for non-admins
  if (dataClassification === 'secret') return true;
  if (dataClassification === 'restricted' && userRole !== 'manager') return true;

  // Sensitive field types require special permissions
  if (['ssn', 'passport', 'payment'].includes(fieldType)) {
    return !['admin', 'manager'].includes(userRole || '');
  }

  return false;
};

/**
 * Secure field renderer that automatically applies masking based on permissions
 */
export const renderSecureField = (
  value: string | null | undefined,
  fieldType: SensitiveFieldType,
  userRole: string | null,
  dataClassification: string = 'confidential',
  options: MaskingOptions = {}
): string => {
  if (!value) return '';

  if (shouldMaskData(userRole, dataClassification, fieldType)) {
    return maskSensitiveData(value, fieldType, options);
  }

  return value;
};

/**
 * Validates if a field contains potentially sensitive data
 */
export const detectSensitiveContent = (value: string): SensitiveFieldType | null => {
  if (!value) return null;

  // SSN patterns
  if (/^\d{3}-?\d{2}-?\d{4}$/.test(value)) return 'ssn';

  // Email patterns
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';

  // Phone patterns
  if (/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) return 'phone';

  // Credit card patterns (basic)
  if (/^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/.test(value)) return 'payment';

  // Passport-like patterns (varies by country)
  if (/^[A-Z]{1,2}\d{6,9}$/.test(value)) return 'passport';

  return null;
};

/**
 * Redacts sensitive data from log messages
 */
export const sanitizeLogData = (data: any): any => {
  if (typeof data === 'string') {
    const sensitiveType = detectSensitiveContent(data);
    if (sensitiveType) {
      return maskSensitiveData(data, sensitiveType);
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive fields entirely in logs
      if (['password', 'token', 'secret', 'key', 'ssn', 'passport'].some(
        sensitive => key.toLowerCase().includes(sensitive)
      )) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }

  return data;
};