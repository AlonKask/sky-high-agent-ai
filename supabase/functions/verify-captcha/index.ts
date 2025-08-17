import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptchaRequest {
  token: string;
  action?: string;
}

interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] CAPTCHA verification request started`, {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Handling CORS preflight`);
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log(`[${requestId}] Invalid method: ${req.method}`);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const { token, action = 'unknown' }: CaptchaRequest = await req.json();
    console.log(`[${requestId}] Request payload:`, { 
      hasToken: !!token, 
      tokenLength: token?.length || 0,
      action 
    });

    if (!token) {
      console.log(`[${requestId}] Missing CAPTCHA token`);
      return new Response(
        JSON.stringify({ success: false, error: 'CAPTCHA token is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check both secret keys for flexibility
    const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
    const siteKey = Deno.env.get('TURNSTILE_SITE_KEY');
    
    console.log(`[${requestId}] Environment check:`, {
      hasSecretKey: !!secretKey,
      hasSiteKey: !!siteKey,
      secretKeyLength: secretKey?.length || 0
    });

    if (!secretKey) {
      console.error(`[${requestId}] TURNSTILE_SECRET_KEY environment variable is not set`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'CAPTCHA service unavailable',
          details: 'Secret key not configured'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify CAPTCHA with Cloudflare Turnstile API
    const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    console.log(`[${requestId}] Preparing Turnstile verification request`);
    
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    
    // Add optional remote IP for enhanced security
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    if (clientIP !== 'unknown') {
      formData.append('remoteip', clientIP);
    }

    console.log(`[${requestId}] Calling Turnstile API`, {
      url: verifyUrl,
      clientIP,
      hasSecret: !!secretKey
    });

    const response = await fetch(verifyUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Supabase-Edge-Function/1.0'
      }
    });

    console.log(`[${requestId}] Turnstile API response:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[${requestId}] Turnstile API request failed:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'CAPTCHA verification service error',
          details: `API returned ${response.status}: ${response.statusText}`
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result: TurnstileResponse = await response.json();

    console.log(`[${requestId}] Turnstile verification result:`, {
      success: result.success,
      hostname: result.hostname,
      timestamp: result.challenge_ts,
      errors: result['error-codes'],
      action: result.action
    });

    // Enhanced validation and logging
    if (result.success) {
      // Additional security checks
      const isValidHostname = result.hostname && (
        result.hostname === 'selectbc.online' ||
        result.hostname === 'localhost' ||
        result.hostname?.includes('lovable.app') ||
        result.hostname?.includes('preview')
      );

      console.log(`[${requestId}] CAPTCHA verification successful`, {
        action,
        hostname: result.hostname,
        timestamp: result.challenge_ts,
        isValidHostname,
        clientIP
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          timestamp: result.challenge_ts,
          hostname: result.hostname,
          requestId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Enhanced error logging for failed verification
      console.warn(`[${requestId}] CAPTCHA verification failed:`, {
        action,
        hostname: result.hostname,
        errors: result['error-codes'],
        clientIP,
        timestamp: result.challenge_ts
      });
      
      // Map common error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        'missing-input-secret': 'Server configuration error',
        'invalid-input-secret': 'Server configuration error',
        'missing-input-response': 'CAPTCHA response missing',
        'invalid-input-response': 'Invalid CAPTCHA response',
        'bad-request': 'Malformed verification request',
        'timeout-or-duplicate': 'CAPTCHA expired or already used',
        'internal-error': 'Verification service temporarily unavailable'
      };

      const primaryError = result['error-codes']?.[0];
      const userMessage = errorMessages[primaryError] || 'CAPTCHA verification failed';

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: userMessage,
          codes: result['error-codes'],
          requestId,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error(`[${requestId}] Critical error in verify-captcha function:`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        requestId,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});