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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
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

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'CAPTCHA token is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
    if (!secretKey) {
      console.error('TURNSTILE_SECRET_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ success: false, error: 'CAPTCHA service unavailable' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify CAPTCHA with Cloudflare Turnstile API
    const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const response = await fetch(verifyUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('Turnstile API request failed:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ success: false, error: 'CAPTCHA verification failed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result: TurnstileResponse = await response.json();

    // Log verification attempt for security monitoring
    console.log(`CAPTCHA verification for action '${action}':`, {
      success: result.success,
      hostname: result.hostname,
      timestamp: result.challenge_ts,
      errors: result['error-codes']
    });

    if (result.success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          timestamp: result.challenge_ts,
          hostname: result.hostname
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Log failed verification
      console.warn('CAPTCHA verification failed:', result['error-codes']);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'CAPTCHA verification failed',
          codes: result['error-codes']
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in verify-captcha function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});