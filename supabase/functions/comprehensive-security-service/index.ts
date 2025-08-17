import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, params } = await req.json();
    console.log(`Security service action: ${action}`, params);

    switch (action) {
      case 'monitor_threats': {
        const { data: threats } = await supabase
          .from('security_events')
          .select('*')
          .eq('severity', 'critical')
          .eq('resolved', false)
          .order('timestamp', { ascending: false })
          .limit(10);

        return new Response(
          JSON.stringify({ threats: threats || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'validate_financial_access': {
        const { table_name, record_id, operation, user_id, justification } = params;
        
        const { data, error } = await supabase.rpc('secure_financial_data_access', {
          p_table_name: table_name,
          p_record_id: record_id,
          p_operation: operation,
          p_justification: justification
        });

        if (error) {
          console.error('Financial access validation error:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ access_granted: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'validate_communication_access': {
        const { user_id, client_id, operation } = params;
        
        const { data, error } = await supabase.rpc('secure_communication_access', {
          p_user_id: user_id,
          p_client_id: client_id,
          p_operation: operation
        });

        if (error) {
          console.error('Communication access validation error:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ access_granted: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'validate_token_access': {
        const { target_user_id, token_type } = params;
        
        const { data, error } = await supabase.rpc('secure_token_access', {
          p_target_user_id: target_user_id,
          p_token_type: token_type
        });

        if (error) {
          console.error('Token access validation error:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ access_granted: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_security_metrics': {
        // Get comprehensive security metrics
        const [
          { data: totalEvents },
          { data: criticalEvents },
          { data: recentThreats },
          { data: accessViolations }
        ] = await Promise.all([
          supabase.from('security_events').select('id', { count: 'exact', head: true }),
          supabase.from('security_events').select('id', { count: 'exact', head: true }).eq('severity', 'critical'),
          supabase.from('security_events').select('*').gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('security_events').select('*').in('event_type', [
            'unauthorized_access_attempt',
            'unauthorized_token_access_attempt',
            'unauthorized_communication_access'
          ]).gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        ]);

        const metrics = {
          total_events: totalEvents?.length || 0,
          critical_events: criticalEvents?.length || 0,
          recent_threats: recentThreats?.length || 0,
          access_violations: accessViolations?.length || 0,
          threat_level: (criticalEvents?.length || 0) > 5 ? 'HIGH' : 
                       (criticalEvents?.length || 0) > 2 ? 'MEDIUM' : 'LOW'
        };

        return new Response(
          JSON.stringify({ metrics }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'emergency_lockdown': {
        const { reason, affected_systems } = params;
        
        // Log emergency lockdown
        await supabase.from('security_events').insert({
          user_id: null,
          event_type: 'emergency_lockdown_initiated',
          severity: 'critical',
          details: {
            reason,
            affected_systems,
            initiated_at: new Date().toISOString(),
            lockdown_level: 'MAXIMUM'
          }
        });

        return new Response(
          JSON.stringify({ lockdown_initiated: true, timestamp: new Date().toISOString() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'audit_trail': {
        const { table_name, days = 7 } = params;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: auditData } = await supabase
          .from('security_events')
          .select('*')
          .gte('timestamp', since)
          .order('timestamp', { ascending: false })
          .limit(100);

        return new Response(
          JSON.stringify({ audit_trail: auditData || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Security service error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});