/**
 * Security headers configuration for the application
 * These should be applied at the server/deployment level
 */

export const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: Reduce in production
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${typeof window !== 'undefined' && window.location.origin} https://ekrwjfdypqzequovmvjn.supabase.co wss://ekrwjfdypqzequovmvjn.supabase.co`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),

  // Additional security headers
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

/**
 * Production CSP configuration (more restrictive)
 */
export const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // May need hashes for specific inline styles
  "img-src 'self' data: https:",
  "font-src 'self'",
  `connect-src 'self' https://ekrwjfdypqzequovmvjn.supabase.co wss://ekrwjfdypqzequovmvjn.supabase.co`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests"
].join('; ');

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  // API endpoints
  '/api/auth/signin': { requests: 5, window: 900000 }, // 5 requests per 15 minutes
  '/api/auth/signup': { requests: 3, window: 3600000 }, // 3 requests per hour
  '/api/email/send': { requests: 100, window: 3600000 }, // 100 emails per hour
  '/api/client/create': { requests: 50, window: 3600000 }, // 50 clients per hour
  
  // Default for other endpoints
  default: { requests: 1000, window: 3600000 } // 1000 requests per hour
};

/**
 * Allowed origins for CORS
 */
export const ALLOWED_ORIGINS = [
  'https://b7f1977e-e173-476b-99ff-3f86c3c87e08.lovableproject.com',
  'https://selectbc.online',
  'https://www.selectbc.online',
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
].filter(Boolean) as string[];