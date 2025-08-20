-- Fix database function overloading issue
-- Drop existing overloaded functions
DROP FUNCTION IF EXISTS public.log_security_event(p_event_type text, p_severity text, p_details jsonb);
DROP FUNCTION IF EXISTS public.log_security_event(p_event_type text, p_severity text, p_details jsonb, p_user_id uuid);

-- Create single consolidated function with optional user_id parameter
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}',
  p_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  final_user_id uuid;
  client_ip inet;
  client_user_agent text;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  final_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Extract client info from request headers if available
  BEGIN
    client_ip := COALESCE(
      (current_setting('request.headers')::json->>'x-real-ip')::inet,
      (current_setting('request.headers')::json->>'x-forwarded-for')::inet,
      '127.0.0.1'::inet
    );
  EXCEPTION WHEN OTHERS THEN
    client_ip := '127.0.0.1'::inet;
  END;
  
  BEGIN
    client_user_agent := current_setting('request.headers')::json->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    client_user_agent := 'Unknown';
  END;
  
  -- Insert security event
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details,
    ip_address,
    user_agent,
    timestamp
  ) VALUES (
    final_user_id,
    p_event_type,
    p_severity,
    p_details || jsonb_build_object(
      'client_ip', client_ip::text,
      'client_user_agent', client_user_agent,
      'server_timestamp', now()
    ),
    client_ip,
    client_user_agent,
    now()
  );
  
  RETURN true;
  
EXCEPTION WHEN OTHERS THEN
  -- Don't let logging failures break the application
  RETURN false;
END;
$$;

-- Create XSS attack blocking system
CREATE OR REPLACE FUNCTION public.block_suspicious_ip(
  p_ip_address inet,
  p_block_duration interval DEFAULT '1 hour'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create blocked_ips table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.blocked_ips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address inet NOT NULL,
    blocked_at timestamp with time zone DEFAULT now(),
    blocked_until timestamp with time zone NOT NULL,
    reason text NOT NULL DEFAULT 'Suspicious activity',
    created_at timestamp with time zone DEFAULT now()
  );
  
  -- Insert or update block record
  INSERT INTO public.blocked_ips (ip_address, blocked_until, reason)
  VALUES (p_ip_address, now() + p_block_duration, 'Repeated XSS attempts')
  ON CONFLICT (ip_address) 
  DO UPDATE SET 
    blocked_until = now() + p_block_duration,
    reason = 'Repeated XSS attempts - Extended block';
  
  RETURN true;
END;
$$;

-- Create function to check if IP is blocked
CREATE OR REPLACE FUNCTION public.is_ip_blocked(p_ip_address inet)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_ips
    WHERE ip_address = p_ip_address 
    AND blocked_until > now()
  );
END;
$$;

-- Create function to get security metrics
CREATE OR REPLACE FUNCTION public.get_security_metrics(time_period interval DEFAULT '24 hours')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  metrics jsonb;
  threat_events integer;
  critical_events integer;
  xss_attempts integer;
  blocked_ips integer;
BEGIN
  -- Count security events by severity
  SELECT COUNT(*) INTO threat_events
  FROM public.security_events
  WHERE timestamp >= now() - time_period
  AND severity IN ('high', 'critical');
  
  SELECT COUNT(*) INTO critical_events
  FROM public.security_events
  WHERE timestamp >= now() - time_period
  AND severity = 'critical';
  
  SELECT COUNT(*) INTO xss_attempts
  FROM public.security_events
  WHERE timestamp >= now() - time_period
  AND event_type LIKE '%xss%';
  
  SELECT COUNT(*) INTO blocked_ips
  FROM public.blocked_ips
  WHERE blocked_until > now();
  
  metrics := jsonb_build_object(
    'period_hours', EXTRACT(EPOCH FROM time_period) / 3600,
    'threat_events', threat_events,
    'critical_events', critical_events,
    'xss_attempts', xss_attempts,
    'blocked_ips', blocked_ips,
    'threat_level', CASE 
      WHEN critical_events > 5 THEN 'CRITICAL'
      WHEN threat_events > 10 THEN 'HIGH'
      WHEN threat_events > 3 THEN 'MEDIUM'
      ELSE 'LOW'
    END,
    'last_updated', now()
  );
  
  RETURN metrics;
END;
$$;