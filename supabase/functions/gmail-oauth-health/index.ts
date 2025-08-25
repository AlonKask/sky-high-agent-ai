import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  console.log('🏥 Gmail OAuth Health Check Request:', req.method, req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables
    const envCheck = {
      google_client_id: !!Deno.env.get('GOOGLE_CLIENT_ID'),
      google_client_secret: !!Deno.env.get('GOOGLE_CLIENT_SECRET'),
      supabase_url: !!Deno.env.get('SUPABASE_URL'),
      service_role_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    };

    console.log('🔍 Environment check:', envCheck);

    const oauthReady = envCheck.google_client_id && envCheck.google_client_secret;
    const backendReady = envCheck.supabase_url && envCheck.service_role_key;

    const healthData = {
      status: (oauthReady && backendReady) ? 'healthy' : 'unhealthy',
      oauth_ready: oauthReady,
      backend_ready: backendReady,
      environment_check: envCheck,
      timestamp: new Date().toISOString(),
      service: 'gmail-oauth'
    };

    console.log('✅ Health check result:', healthData);

    return new Response(
      JSON.stringify({
        success: true,
        data: healthData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});