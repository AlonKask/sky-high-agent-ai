
/**
 * Security headers configuration for the application
 * These should be applied at the server/deployment level
 */

// Detect environment safely in browser
const getEnvironment = () => {
  if (typeof window === 'undefined') return 'production';
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
  return 'production';
};

const currentEnvironment = getEnvironment();

export const SECURITY_HEADERS = {
  // Enhanced Content Security Policy (Production - strict)
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'nonce-lovable-security' https://accounts.google.com https://challenges.cloudflare.com",
    "style-src 'self' 'nonce-lovable-security' https://fonts.googleapis.com",
    "img-src 'self' data: https://ekrwjfdypqzequovmvjn.supabase.co",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://ekrwjfdypqzequovmvjn.supabase.co wss://ekrwjfdypqzequovmvjn.supabase.co https://accounts.google.com https://oauth2.googleapis.com https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
    "require-trusted-types-for 'script'",
    "report-uri https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/csp-report"
  ].join('; '),

  // Enhanced security headers
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0', // Disabled in favor of CSP
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), fullscreen=(self)',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
};

/**
 * Development CSP configuration (more permissive for debugging)
 */
export const DEVELOPMENT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://ekrwjfdypqzequovmvjn.supabase.co wss://ekrwjfdypqzequovmvjn.supabase.co https://accounts.google.com https://oauth2.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "report-uri https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/csp-report"
].join('; ');

/**
 * Enhanced rate limiting configuration
 */
export const RATE_LIMITS = {
  // Authentication endpoints (stricter)
  '/api/auth/signin': { requests: 3, window: 900000 }, // 3 requests per 15 minutes
  '/api/auth/signup': { requests: 2, window: 3600000 }, // 2 requests per hour
  '/api/auth/password-reset': { requests: 2, window: 3600000 }, // 2 requests per hour
  
  // Sensitive operations
  '/api/client/create': { requests: 20, window: 3600000 }, // 20 clients per hour
  '/api/client/sensitive': { requests: 10, window: 3600000 }, // 10 sensitive data requests per hour
  '/api/email/send': { requests: 50, window: 3600000 }, // 50 emails per hour
  '/api/gmail/sync': { requests: 30, window: 3600000 }, // 30 sync requests per hour
  
  // Admin operations
  '/api/admin/*': { requests: 100, window: 3600000 }, // 100 admin operations per hour
  
  // Default for other endpoints
  default: { requests: 500, window: 3600000 } // 500 requests per hour
};

/**
 * Enhanced CORS configuration with strict origin validation
 */
export const ALLOWED_ORIGINS = [
  'https://b7f1977e-e173-476b-99ff-3f86c3c87e08.lovableproject.com',
  // Development origins (only in development)
  ...(currentEnvironment === 'development' ? [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ] : [])
].filter(Boolean) as string[];

/**
 * Security monitoring configuration
 */
export const SECURITY_MONITORING = {
  // Alert thresholds
  FAILED_LOGIN_THRESHOLD: 5,
  SUSPICIOUS_IP_THRESHOLD: 10,
  RATE_LIMIT_VIOLATION_THRESHOLD: 3,
  
  // Monitoring windows (in seconds)
  LOGIN_MONITOR_WINDOW: 900, // 15 minutes
  IP_MONITOR_WINDOW: 3600, // 1 hour
  
  // Auto-block settings
  AUTO_BLOCK_ENABLED: true,
  BLOCK_DURATION: 86400, // 24 hours
  
  // Alert destinations
  ALERT_EMAIL: 'security@selectbusinessclass.com',
  WEBHOOK_URL: undefined // Will be undefined in browser
};

/**
 * Production security validation
 */
export const validateSecurityConfig = (): boolean => {
  // Ensure CSP is properly configured for production
  if (currentEnvironment === 'production') {
    const csp = SECURITY_HEADERS['Content-Security-Policy'];
    
    // Check for dangerous CSP directives in production
    if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
      console.warn('⚠️  SECURITY WARNING: Unsafe CSP directives detected in production');
      return false;
    }
  }
  
  return true;
};
