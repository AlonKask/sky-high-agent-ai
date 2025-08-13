// Rate limiting utility for edge functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  total: number;
}

export class RateLimiter {
  private supabase: any;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async checkLimit(req: Request): Promise<RateLimitResult> {
    const identifier = this.config.keyGenerator 
      ? this.config.keyGenerator(req)
      : this.getDefaultIdentifier(req);
    
    const endpoint = new URL(req.url).pathname;
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.windowMs);

    try {
      // Clean up old entries
      await this.supabase
        .from('rate_limits')
        .delete()
        .lt('window_start', windowStart.toISOString());

      // Get current count for this identifier and endpoint
      const { data: existingLimits, error: fetchError } = await this.supabase
        .from('rate_limits')
        .select('request_count, window_start')
        .eq('identifier', identifier)
        .eq('endpoint', endpoint)
        .gte('window_start', windowStart.toISOString())
        .order('window_start', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Rate limit fetch error:', fetchError);
        // SECURITY: Fail closed - deny request if we can't check rate limits
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(now.getTime() + this.config.windowMs),
          total: this.config.maxRequests
        };
      }

      const currentCount = existingLimits?.[0]?.request_count || 0;
      const remaining = Math.max(0, this.config.maxRequests - currentCount - 1);
      const allowed = currentCount < this.config.maxRequests;

      if (allowed) {
        // Increment counter
        if (existingLimits && existingLimits.length > 0) {
          await this.supabase
            .from('rate_limits')
            .update({ 
              request_count: currentCount + 1,
              created_at: now.toISOString()
            })
            .eq('identifier', identifier)
            .eq('endpoint', endpoint)
            .gte('window_start', windowStart.toISOString());
        } else {
          await this.supabase
            .from('rate_limits')
            .insert({
              identifier,
              endpoint,
              request_count: 1,
              window_start: now.toISOString()
            });
        }
      }

      return {
        allowed,
        remaining,
        resetTime: new Date(now.getTime() + this.config.windowMs),
        total: this.config.maxRequests
      };

    } catch (error) {
      console.error('Rate limiting error:', error);
      // SECURITY: Fail closed - deny request if rate limiting fails
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(now.getTime() + this.config.windowMs),
        total: this.config.maxRequests
      };
    }
  }

  private getDefaultIdentifier(req: Request): string {
    // Try to get IP address from various headers
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    return forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  }

  createHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': result.total.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.getTime().toString(),
    };
  }
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // Very strict for sensitive operations
  strict: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 requests per minute
  
  // Moderate for normal API calls
  moderate: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
  
  // Lenient for public endpoints
  lenient: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  
  // For user-specific actions
  userBased: { 
    windowMs: 60 * 1000, 
    maxRequests: 50,
    keyGenerator: (req: Request) => {
      const authHeader = req.headers.get('authorization');
      return authHeader ? `user:${authHeader}` : 'anonymous';
    }
  }
};

// Helper function to apply rate limiting to edge functions
export async function withRateLimit(
  req: Request,
  config: RateLimitConfig,
  handler: () => Promise<Response>
): Promise<Response> {
  const limiter = new RateLimiter(config);
  const result = await limiter.checkLimit(req);
  
  const headers = {
    ...limiter.createHeaders(result),
    'Access-Control-Allow-Origin': 'https://b7f1977e-e173-476b-99ff-3f86c3c87e08.lovableproject.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${result.total} per ${config.windowMs / 1000} seconds`,
        resetTime: result.resetTime.toISOString()
      }),
      {
        status: 429,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(config.windowMs / 1000).toString()
        }
      }
    );
  }

  const response = await handler();
  
  // Add rate limit headers to successful responses
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}