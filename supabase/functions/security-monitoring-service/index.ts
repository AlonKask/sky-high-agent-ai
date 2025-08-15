import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();

    let result;

    switch (action) {
      case 'calculate_metrics':
        result = await supabaseClient.rpc('calculate_security_metrics', {
          p_time_window_hours: params.timeWindowHours || 24
        });
        break;

      case 'detect_anomaly':
        result = await supabaseClient.rpc('detect_session_anomaly', {
          p_user_id: params.userId,
          p_current_fingerprint: params.fingerprint,
          p_ip_address: params.ipAddress,
          p_user_agent: params.userAgent
        });
        break;

      case 'check_rate_limit':
        result = await supabaseClient.rpc('advanced_rate_limit_check', {
          p_identifier: params.identifier,
          p_endpoint: params.endpoint,
          p_ip_address: params.ipAddress,
          p_max_requests: params.maxRequests || 10,
          p_window_minutes: params.windowMinutes || 15
        });
        break;

      case 'generate_compliance_report':
        result = await supabaseClient.rpc('generate_compliance_report', {
          p_report_type: params.reportType || 'gdpr',
          p_start_date: params.startDate,
          p_end_date: params.endDate
        });
        break;

      case 'cleanup_data':
        result = await supabaseClient.rpc('automated_data_retention_cleanup');
        break;

      case 'get_security_alerts':
        result = await supabaseClient
          .from('security_alerts')
          .select('*')
          .eq('acknowledged', false)
          .order('created_at', { ascending: false })
          .limit(params.limit || 50);
        break;

      case 'acknowledge_alert':
        result = await supabaseClient
          .from('security_alerts')
          .update({
            acknowledged: true,
            acknowledged_by: params.userId,
            acknowledged_at: new Date().toISOString()
          })
          .eq('id', params.alertId);
        break;

      case 'create_security_alert':
        result = await supabaseClient
          .from('security_alerts')
          .insert({
            alert_type: params.alertType,
            severity: params.severity,
            title: params.title,
            description: params.description,
            metadata: params.metadata || {}
          });
        break;

      case 'health_check':
        // Perform comprehensive health check
        const healthChecks = await Promise.allSettled([
          supabaseClient.from('security_events').select('count').limit(1),
          supabaseClient.from('security_alerts').select('count').limit(1),
          supabaseClient.rpc('calculate_security_metrics', { p_time_window_hours: 1 })
        ]);

        const healthStatus = {
          timestamp: new Date().toISOString(),
          database: healthChecks[0].status === 'fulfilled',
          alerts: healthChecks[1].status === 'fulfilled',
          metrics: healthChecks[2].status === 'fulfilled',
          overall: healthChecks.every(check => check.status === 'fulfilled')
        };

        result = { data: healthStatus, error: null };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (result.error) {
      console.error('Security monitoring error:', result.error);
      return new Response(
        JSON.stringify({ error: result.error.message || 'Security operation failed' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ data: result.data, success: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Security monitoring service error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal security monitoring error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});