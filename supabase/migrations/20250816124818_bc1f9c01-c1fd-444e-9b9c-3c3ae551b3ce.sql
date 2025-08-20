-- FIX FINAL 3 SECURITY WARNINGS - FUNCTION SEARCH PATH
-- Add missing SET search_path TO 'public' to remaining functions

-- 1. Fix generate_sample_dashboard_data function
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
    'recent_bookings', jsonb_build_array(
      jsonb_build_object(
        'client_name', 'Sample Client A',
        'destination', 'London',
        'amount', round((random() * 5000 + 1000)::numeric, 2),
        'date', now() - (random() * interval '7 days')
      ),
      jsonb_build_object(
        'client_name', 'Sample Client B',
        'destination', 'Tokyo',
        'amount', round((random() * 8000 + 2000)::numeric, 2),
        'date', now() - (random() * interval '14 days')
      )
    ),
    'generated_at', now(),
    'agent_id', p_agent_id
  );
  
  RETURN result;
END;
$$;

-- 2. Fix update_agent_performance_metrics function
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
    -- Calculate metrics for the agent
    INSERT INTO agent_performance_metrics (
      agent_id,
      metric_date,
      calls_made,
      emails_sent,
      response_time_avg,
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
      floor(random() * 20 + 5)::int, -- Sample calls made
      floor(random() * 50 + 10)::int, -- Sample emails sent
      (random() * interval '2 hours' + interval '30 minutes'), -- Sample response time
      round((random() * 25 + 50)::numeric, 2), -- Sample conversion rate
      round((random() * 2 + 3)::numeric, 1), -- Sample satisfaction score
      round((random() * 10000 + 2000)::numeric, 2), -- Sample revenue
      round((random() * 1000 + 200)::numeric, 2), -- Sample commission
      (random() > 0.3), -- Sample target achieved
      now(),
      now()
    )
    ON CONFLICT (agent_id, metric_date)
    DO UPDATE SET
      calls_made = EXCLUDED.calls_made,
      emails_sent = EXCLUDED.emails_sent,
      response_time_avg = EXCLUDED.response_time_avg,
      conversion_rate = EXCLUDED.conversion_rate,
      satisfaction_score = EXCLUDED.satisfaction_score,
      revenue_generated = EXCLUDED.revenue_generated,
      commission_earned = EXCLUDED.commission_earned,
      target_achieved = EXCLUDED.target_achieved,
      updated_at = now();
  END LOOP;
  
  -- Log the metrics update
  PERFORM log_security_event(
    'agent_metrics_updated',
    'low',
    jsonb_build_object(
      'update_date', metric_date,
      'updated_by', 'system',
      'agents_updated', (
        SELECT COUNT(DISTINCT ur.user_id)
        FROM user_roles ur
        WHERE ur.role IN ('agent', 'sales_agent', 'cs_agent')
      )
    )
  );
END;
$$;

-- 3. Fix any other remaining function that might not have search path
-- Let's also ensure the client data secure access function has proper search path
CREATE OR REPLACE FUNCTION public.secure_client_data_access(p_client_id uuid, p_access_reason text DEFAULT 'general_access')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_data jsonb;
  user_role app_role;
  client_owner_id uuid;
BEGIN
  -- Get client owner
  SELECT user_id INTO client_owner_id
  FROM clients
  WHERE id = p_client_id;
  
  IF client_owner_id IS NULL THEN
    RAISE EXCEPTION 'Client not found' USING ERRCODE = '02000';
  END IF;
  
  -- Check access permission using ultra strict function
  IF NOT can_access_client_data_ultra_strict(client_owner_id, p_client_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  
  -- Get user role
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = auth.uid();
  
  -- Log the access attempt
  PERFORM log_security_event(
    'secure_client_data_accessed',
    'medium',
    jsonb_build_object(
      'client_id', p_client_id,
      'access_reason', p_access_reason,
      'user_role', user_role,
      'client_owner', client_owner_id
    )
  );
  
  -- Get non-sensitive client data with role-based masking
  SELECT to_jsonb(c) INTO client_data
  FROM (
    SELECT id, user_id, first_name, last_name, email, phone, company,
           preferred_class, notes, total_bookings, total_spent, last_trip_date,
           date_of_birth, client_type, created_at, updated_at
    FROM clients
    WHERE id = p_client_id
  ) c;
  
  -- Apply data masking
  client_data := mask_client_data(client_data, COALESCE(user_role, 'agent'::app_role));
  
  RETURN client_data;
END;
$$;