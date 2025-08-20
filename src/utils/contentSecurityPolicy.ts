// Content Security Policy Configuration
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'", 
    "'unsafe-inline'", // Required for Vite in development - remove in production
    "'unsafe-eval'", // Required for development build - remove in production
    "https://challenges.cloudflare.com", // Turnstile
    "https://js.stripe.com", // Stripe if used
    "https://apis.google.com", // Google APIs
    "'nonce-lovable-security'" // Add nonce for inline scripts
  ],
  'style-src': [
    "'self'", 
    "'unsafe-inline'", // Required for Tailwind - consider using nonce in production
    "https://fonts.googleapis.com"
  ],
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com",
    "data:" // For icon fonts
  ],
  'img-src': [
    "'self'",
    "data:",
    "blob:",
    "https:", // Allow HTTPS images - restrict further in production
    "https://*.supabase.co" // Supabase storage
  ],
  'connect-src': [
    "'self'",
    "https://*.supabase.co", // Supabase API
    "https://challenges.cloudflare.com", // Turnstile
    "https://api.stripe.com", // Stripe if used
    "https://www.googleapis.com", // Gmail API
    "https://oauth2.googleapis.com" // Google OAuth
  ],
  'frame-src': [
    "https://challenges.cloudflare.com", // Turnstile
    "https://js.stripe.com" // Stripe if used
  ],
  'frame-ancestors': ["'none'"], // Prevent clickjacking
  'object-src': ["'none'"], // Prevent plugins
  'base-uri': ["'self'"], // Prevent base tag injection
  'form-action': ["'self'"], // Restrict form submissions
  'upgrade-insecure-requests': [], // Force HTTPS
  'block-all-mixed-content': [] // Block mixed content
};

export const generateCSPHeader = (): string => {
  const directives = Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
  
  return directives;
};

export const applyCSPHeaders = (): void => {
  // Apply CSP meta tag for client-side protection
  const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!existingCSP) {
    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    meta.setAttribute('content', generateCSPHeader());
    document.head.appendChild(meta);
  }
  
  // Additional security headers via meta tags
  const securityHeaders = [
    { name: 'X-Frame-Options', content: 'DENY' },
    { name: 'X-Content-Type-Options', content: 'nosniff' },
    { name: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
    { name: 'X-XSS-Protection', content: '1; mode=block' }
  ];
  
  securityHeaders.forEach(header => {
    const existing = document.querySelector(`meta[http-equiv="${header.name}"]`);
    if (!existing) {
      const meta = document.createElement('meta');
      meta.setAttribute('http-equiv', header.name);
      meta.setAttribute('content', header.content);
      document.head.appendChild(meta);
    }
  });
};