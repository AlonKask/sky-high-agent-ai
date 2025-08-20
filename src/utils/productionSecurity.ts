/**
 * Production security hardening utilities
 * Implements additional security measures for production deployment
 */

export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://api.openai.com https://platform.ringcentral.com wss://*.supabase.co",
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

export const validateEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const maskSensitiveData = (data: string, type: 'email' | 'phone' | 'token' = 'email'): string => {
  switch (type) {
    case 'email':
      const [username, domain] = data.split('@');
      if (!username || !domain) return '***@***.***';
      return `${username.substring(0, 2)}***@${domain}`;
    case 'phone':
      return data.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
    case 'token':
      return data.substring(0, 8) + '***' + data.substring(data.length - 4);
    default:
      return '***';
  }
};

export const generateSecureNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  // Simple CSRF validation - in production, use proper HMAC
  return token === btoa(sessionToken).substring(0, 32);
};