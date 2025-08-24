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
    console.log('🏥 Health check request received');
    
    // Basic connectivity and timestamp
    const timestamp = new Date().toISOString();
    
    // Parse any request body for additional checks
    let requestData = null;
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch (e) {
        // Non-JSON request is fine for health check
        requestData = { raw: true };
      }
    }
    
    const healthData = {
      status: 'healthy',
      timestamp: timestamp,
      service: 'supabase-edge-function',
      function_name: 'health-check',
      version: '1.0.0',
      request_method: req.method,
      request_data: requestData,
      uptime: true,
      connectivity: true
    };
    
    console.log('✅ Health check passed:', healthData);
    
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
        error: 'Health check failed',
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