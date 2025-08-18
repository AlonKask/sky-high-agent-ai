import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  healthy: boolean;
  timestamp: string;
  services: {
    turnstile: {
      configured: boolean;
      secretKeyPresent: boolean;
      siteKeyPresent: boolean;
    };
    network: {
      turnstileApiReachable: boolean;
      responseTime?: number;
    };
    environment: {
      deployment: string;
      edgeFunctionVersion: string;
    };
  };
  errors?: string[];
}

serve(async (req) => {
  const healthCheckId = crypto.randomUUID().substring(0, 8);
  console.log(`[HEALTH-${healthCheckId}] CAPTCHA health check started`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const errors: string[] = [];
  const startTime = Date.now();

  try {
    // Check environment variables
    const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
    const siteKey = Deno.env.get('TURNSTILE_SITE_KEY');
    
    console.log(`[HEALTH-${healthCheckId}] Environment check:`, {
      hasSecretKey: !!secretKey,
      hasSiteKey: !!siteKey
    });

    if (!secretKey) {
      errors.push('TURNSTILE_SECRET_KEY not configured');
    }

    // Test Turnstile API connectivity
    let turnstileApiReachable = false;
    let responseTime: number | undefined;

    try {
      const testStartTime = Date.now();
      const testResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new FormData(), // Empty form data for connectivity test
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      responseTime = Date.now() - testStartTime;
      turnstileApiReachable = testResponse.status === 400; // We expect 400 for malformed request
      
      console.log(`[HEALTH-${healthCheckId}] Turnstile API test:`, {
        reachable: turnstileApiReachable,
        responseTime,
        status: testResponse.status
      });
      
    } catch (error) {
      console.error(`[HEALTH-${healthCheckId}] Turnstile API test failed:`, error.message);
      errors.push(`Turnstile API unreachable: ${error.message}`);
    }

    const result: HealthCheckResult = {
      healthy: errors.length === 0 && turnstileApiReachable,
      timestamp: new Date().toISOString(),
      services: {
        turnstile: {
          configured: !!secretKey,
          secretKeyPresent: !!secretKey,
          siteKeyPresent: !!siteKey
        },
        network: {
          turnstileApiReachable,
          responseTime
        },
        environment: {
          deployment: Deno.env.get('DENO_DEPLOYMENT_ID') || 'unknown',
          edgeFunctionVersion: '1.0.0'
        }
      },
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`[HEALTH-${healthCheckId}] Health check complete:`, {
      healthy: result.healthy,
      errorCount: errors.length,
      totalTime: Date.now() - startTime
    });

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.healthy ? 200 : 503
      }
    );

  } catch (error) {
    console.error(`[HEALTH-${healthCheckId}] Health check failed:`, error);
    
    return new Response(
      JSON.stringify({
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error.message,
        healthCheckId
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});