import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withRateLimit } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withRateLimit(10, 300)(async (req) => {
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData = await req.json();
    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      request_details,
      origin,
      destination,
      departure_date,
      return_date,
      passengers,
      class_preference,
      special_requirements
    } = requestData;

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';

    // Check rate limiting
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc(
      'check_rate_limit',
      {
        p_identifier: clientIP,
        p_endpoint: 'public_request_submission',
        p_max_requests: 5,
        p_window_minutes: 60
      }
    );

    if (rateLimitError || !rateLimitCheck) {
      console.error('Rate limit check failed:', rateLimitError);
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.',
          success: false 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid email format',
          success: false 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if this email already has pending requests (spam prevention)
    const { data: existingRequests, error: checkError } = await supabase
      .from('clients')
      .select('id, email')
      .eq('email', email)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing requests:', checkError);
    }

    // If this is a new email, create basic security validation
    if (!existingRequests || existingRequests.length === 0) {
      // Log new client creation for security monitoring
      await supabase.rpc('log_security_event', {
        p_event_type: 'public_client_creation',
        p_severity: 'low',
        p_details: {
          email: email,
          ip_address: clientIP,
          user_agent: req.headers.get('user-agent')
        }
      });
    }

    // Get default agent assignment (first admin/manager)
    const { data: defaultAgent } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'manager'])
      .limit(1);

    const assignedUserId = defaultAgent?.[0]?.user_id;

    if (!assignedUserId) {
      console.error('No admin/manager found for assignment');
      return new Response(
        JSON.stringify({ 
          error: 'System configuration error. Please contact support.',
          success: false 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create or find client
    let clientId;
    if (existingRequests && existingRequests.length > 0) {
      clientId = existingRequests[0].id;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: assignedUserId,
          first_name,
          last_name,
          email,
          phone: phone || null,
          client_type: 'prospect',
          data_classification: 'public'
        })
        .select('id')
        .single();

      if (clientError) {
        console.error('Error creating client:', clientError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create client record',
            success: false 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      clientId = newClient.id;
    }

    // Create the request
    const { data: newRequest, error: requestError } = await supabase
      .from('requests')
      .insert({
        user_id: assignedUserId,
        client_id: clientId,
        request_type: 'flight',
        origin: origin || '',
        destination: destination || '',
        departure_date: departure_date ? new Date(departure_date).toISOString().split('T')[0] : null,
        return_date: return_date ? new Date(return_date).toISOString().split('T')[0] : null,
        passengers: passengers || 1,
        class_preference: class_preference || 'business',
        special_requirements: special_requirements || '',
        status: 'pending',
        priority: 'medium',
        notes: request_details || ''
      })
      .select('id')
      .single();

    if (requestError) {
      console.error('Error creating request:', requestError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create request',
          success: false 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create notification for assigned agent
    await supabase.rpc('create_notification', {
      p_user_id: assignedUserId,
      p_title: 'New Public Request',
      p_message: `New flight request from ${first_name} ${last_name} (${email})`,
      p_type: 'request',
      p_priority: 'medium',
      p_related_id: newRequest.id,
      p_related_type: 'request'
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Request submitted successfully. You will be contacted soon.',
        request_id: newRequest.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Public request submission error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}));