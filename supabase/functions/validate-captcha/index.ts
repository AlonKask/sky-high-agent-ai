import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptchaValidationRequest {
  token: string;
  remoteip?: string;
}

interface HCaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  credit?: boolean;
  'error-codes'?: string[];
  score?: number;
  score_reason?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, remoteip }: CaptchaValidationRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'CAPTCHA token is required' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const hcaptchaSecret = Deno.env.get('HCAPTCHA_SECRET_KEY');
    
    if (!hcaptchaSecret) {
      console.error('HCAPTCHA_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare form data for hCaptcha verification
    const formData = new FormData();
    formData.append('secret', hcaptchaSecret);
    formData.append('response', token);
    if (remoteip) {
      formData.append('remoteip', remoteip);
    }

    // Verify CAPTCHA with hCaptcha service
    const verifyResponse = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      body: formData,
    });

    if (!verifyResponse.ok) {
      throw new Error(`hCaptcha verification failed: ${verifyResponse.status}`);
    }

    const verifyResult: HCaptchaResponse = await verifyResponse.json();

    console.log('hCaptcha verification result:', {
      success: verifyResult.success,
      hostname: verifyResult.hostname,
      score: verifyResult.score,
      errorCodes: verifyResult['error-codes']
    });

    if (!verifyResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'CAPTCHA verification failed',
          errorCodes: verifyResult['error-codes']
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Log successful verification for security monitoring
    console.log('CAPTCHA verification successful:', {
      timestamp: new Date().toISOString(),
      hostname: verifyResult.hostname,
      score: verifyResult.score
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        timestamp: verifyResult.challenge_ts,
        hostname: verifyResult.hostname,
        score: verifyResult.score
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in validate-captcha function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Server error during CAPTCHA validation' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});