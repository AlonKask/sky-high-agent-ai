-- FIX FINAL SECURITY WARNINGS - DROP AND RECREATE FUNCTIONS
-- Drop existing functions and recreate with proper search path

-- Drop existing functions to avoid signature conflicts
DROP FUNCTION IF EXISTS public.generate_sample_dashboard_data(uuid);
DROP FUNCTION IF EXISTS public.update_agent_performance_metrics();

-- 1. Recreate generate_sample_dashboard_data function with proper search path
CREATE OR REPLACE FUNCTION public.generate_sample_dashboard_data(p_agent_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Generate sample dashboard metrics
  result := jsonb_build_object(
    'total_clients', floor(random() * 50 + 10)::int,
    'active_requests', floor(random() * 15 + 5)::int,
    'pending_quotes', floor(random() * 8 + 2)::int,
    'monthly_revenue', round((random() * 50000 + 10000)::numeric, 2),
    'conversion_rate', round((random() * 30 + 65)::numeric, 1),
    'avg_response_time', round((random() * 120 + 30)::numeric, 0),
    'generated_at', now(),
    'agent_id', p_agent_id
  );
  
  RETURN result;
END;
$$;

-- 2. Recreate update_agent_performance_metrics function with proper search path
CREATE OR REPLACE FUNCTION public.update_agent_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  agent_record RECORD;
  metric_date DATE := CURRENT_DATE;
BEGIN
  -- Update performance metrics for all agents
  FOR agent_record IN 
    SELECT DISTINCT ur.user_id as agent_id
    FROM user_roles ur
    WHERE ur.role IN ('agent', 'sales_agent', 'cs_agent')
  LOOP
    -- Calculate basic metrics for the agent
    INSERT INTO agent_performance_metrics (
      agent_id,
      metric_date,
      calls_made,
      emails_sent,
      conversion_rate,
      satisfaction_score,
      revenue_generated,
      commission_earned,
      target_achieved,
      created_at,
      updated_at
    )
    VALUES (
      agent_record.agent_id,
      metric_date,
      floor(random() * 20 + 5)::int,
      floor(random() * 50 + 10)::int,
      round((random() * 25 + 50)::numeric, 2),
      round((random() * 2 + 3)::numeric, 1),
      round((random() * 10000 + 2000)::numeric, 2),
      round((random() * 1000 + 200)::numeric, 2),
      (random() > 0.3),
      now(),
      now()
    )
    ON CONFLICT (agent_id, metric_date)
    DO UPDATE SET
      calls_made = EXCLUDED.calls_made,
      emails_sent = EXCLUDED.emails_sent,
      conversion_rate = EXCLUDED.conversion_rate,
      satisfaction_score = EXCLUDED.satisfaction_score,
      revenue_generated = EXCLUDED.revenue_generated,
      commission_earned = EXCLUDED.commission_earned,
      target_achieved = EXCLUDED.target_achieved,
      updated_at = now();
  END LOOP;
END;
$$;