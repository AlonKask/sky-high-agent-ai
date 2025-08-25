import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const healthReport = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      oauth_ready: false,
      environment_check: {}
    };

    // Check required environment variables
    const requiredEnvVars = {
      'google_client_id': 'GOOGLE_CLIENT_ID',
      'google_client_secret': 'GOOGLE_CLIENT_SECRET',
      'supabase_url': 'SUPABASE_URL',
      'service_role_key': 'SUPABASE_SERVICE_ROLE_KEY'
    };

    for (const [key, envVar] of Object.entries(requiredEnvVars)) {
      healthReport.environment_check[key] = !!Deno.env.get(envVar);
    }

    healthReport.oauth_ready = Object.values(healthReport.environment_check).every(v => v);
    healthReport.status = healthReport.oauth_ready ? 'healthy' : 'unhealthy';

    return new Response(
      JSON.stringify({
        success: true,
        data: healthReport
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Health check failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});