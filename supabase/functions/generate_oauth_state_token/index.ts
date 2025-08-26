import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();
    
    if (!user_id) {
      throw new Error('User ID is required');
    }

    // Generate cryptographically secure state token
    const stateTokenBytes = new Uint8Array(32);
    crypto.getRandomValues(stateTokenBytes);
    const stateToken = Array.from(stateTokenBytes, byte => 
      byte.toString(16).padStart(2, '0')
    ).join('');

    // Store state token with expiration
    const { data, error } = await supabaseClient
      .from('oauth_state_tokens')
      .insert({
        user_id,
        state_token: stateToken,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        used: false
      })
      .select('state_token')
      .single();

    if (error) {
      console.error('Failed to store state token:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ state_token: data.state_token }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Generate state token error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate state token' 
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