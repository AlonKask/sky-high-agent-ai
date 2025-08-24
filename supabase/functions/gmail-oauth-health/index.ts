import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏥 Gmail OAuth Health Check');
    
    // Check environment variables needed for OAuth
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'gmail-oauth-health',
      environment_check: {
        google_client_id: !!clientId,
        google_client_secret: !!clientSecret,
        supabase_url: !!supabaseUrl,
        service_role_key: !!serviceKey
      },
      oauth_ready: !!(clientId && clientSecret && supabaseUrl && serviceKey)
    };
    
    console.log('✅ Gmail OAuth health check completed:', healthData);
    
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
    console.error('❌ Gmail OAuth health check failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Gmail OAuth health check failed',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});