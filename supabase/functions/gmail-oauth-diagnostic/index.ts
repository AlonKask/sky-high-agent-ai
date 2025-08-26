import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { diagnosticType = 'full' } = await req.json();
    console.log(`🔍 Running Gmail OAuth diagnostic: ${diagnosticType}`);
    
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabase = createClient(supabaseUrl || '', serviceRoleKey || '');
    
    const results = {
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl,
        hasServiceRole: !!serviceRoleKey,
        hasGoogleClientId: !!Deno.env.get('GOOGLE_CLIENT_ID'),
        hasGoogleClientSecret: !!Deno.env.get('GOOGLE_CLIENT_SECRET'),
      },
      database: {},
      oauth: {},
      connectivity: {}
    };
    
    // Test database connectivity
    try {
      const { data: healthData, error: healthError } = await supabase
        .rpc('health_check');
      
      results.database = {
        connected: !healthError,
        health: healthData,
        error: healthError?.message
      };
    } catch (dbError) {
      results.database = {
        connected: false,
        error: dbError.message
      };
    }
    
    // Check OAuth state tokens
    try {
      const { data: tokens, error: tokenError } = await supabase
        .from('oauth_state_tokens')
        .select('id, user_id, created_at, expires_at, used')
        .order('created_at', { ascending: false })
        .limit(10);
        
      results.oauth.stateTokens = {
        success: !tokenError,
        count: tokens?.length || 0,
        recent: tokens?.slice(0, 3) || [],
        error: tokenError?.message
      };
    } catch (tokenError) {
      results.oauth.stateTokens = {
        success: false,
        error: tokenError.message
      };
    }
    
    // Check Gmail credentials
    try {
      const { data: creds, error: credError } = await supabase
        .from('gmail_credentials')
        .select('id, user_id, gmail_user_email, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
        
      results.oauth.credentials = {
        success: !credError,
        count: creds?.length || 0,
        recent: creds || [],
        error: credError?.message
      };
    } catch (credError) {
      results.oauth.credentials = {
        success: false,
        error: credError.message
      };
    }
    
    // Test callback URL accessibility
    const callbackUrl = 'https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/gmail-oauth?test=callback';
    try {
      console.log(`🔍 Testing callback URL: ${callbackUrl}`);
      const testResponse = await fetch(callbackUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Gmail-OAuth-Diagnostic/1.0'
        }
      });
      
      const testResult = await testResponse.text();
      results.connectivity.callbackTest = {
        accessible: testResponse.ok,
        status: testResponse.status,
        response: testResult.substring(0, 200) // First 200 chars
      };
    } catch (fetchError) {
      results.connectivity.callbackTest = {
        accessible: false,
        error: fetchError.message
      };
    }
    
    // Check recent security events
    try {
      const { data: events, error: eventsError } = await supabase
        .from('security_events')
        .select('event_type, severity, details, timestamp')
        .or('event_type.like.%oauth%,event_type.like.%gmail%')
        .order('timestamp', { ascending: false })
        .limit(10);
        
      results.oauth.recentEvents = {
        success: !eventsError,
        count: events?.length || 0,
        events: events || [],
        error: eventsError?.message
      };
    } catch (eventsError) {
      results.oauth.recentEvents = {
        success: false,
        error: eventsError.message
      };
    }
    
    console.log(`✅ Gmail OAuth diagnostic complete:`, results);
    
    return new Response(
      JSON.stringify(results, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});