import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://b7f1977e-e173-476b-99ff-3f86c3c87e08.lovableproject.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse CSP violation report
    const violation = await req.json();
    
    console.log('CSP Violation Report:', violation);

    // Store CSP violation in database
    const { error } = await supabaseClient
      .from('csp_violations')
      .insert({
        violation_data: violation,
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || 
                    req.headers.get('x-real-ip') || 
                    req.headers.get('cf-connecting-ip') || 
                    'unknown',
        user_agent: req.headers.get('user-agent')
      });

    if (error) {
      console.error('Failed to store CSP violation:', error);
    }

    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('CSP report error:', error);
    return new Response('Error processing report', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});