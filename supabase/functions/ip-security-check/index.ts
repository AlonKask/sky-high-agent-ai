import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get client IP address
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    if (req.method === 'GET') {
      // Check if IP is blocked
      const { data: blockedIP } = await supabaseClient
        .from('blocked_ips')
        .select('*')
        .eq('ip_address', clientIP)
        .gt('expires_at', new Date().toISOString())
        .single();

      return new Response(
        JSON.stringify({
          blocked: !!blockedIP,
          ip: clientIP,
          reason: blockedIP?.reason || null,
          expires_at: blockedIP?.expires_at || null
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    if (req.method === 'POST') {
      // Block an IP address
      const { reason = 'security_violation', duration_hours = 24 } = await req.json();

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + duration_hours);

      const { error } = await supabaseClient
        .from('blocked_ips')
        .upsert({
          ip_address: clientIP,
          reason,
          expires_at: expiresAt.toISOString(),
          block_count: 1
        }, { 
          onConflict: 'ip_address',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          blocked_ip: clientIP,
          expires_at: expiresAt.toISOString(),
          reason
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('IP security check error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'IP security check failed',
        details: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});