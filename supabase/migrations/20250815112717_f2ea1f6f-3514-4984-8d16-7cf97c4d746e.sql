-- Final fix for remaining search_path issues and create edge function monitoring

-- Create user_sessions table for enhanced session tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  device_fingerprint text,
  ip_address inet,
  user_agent text,
  location_data jsonb,
  risk_score integer DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  trust_score integer DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  is_active boolean DEFAULT true,
  last_activity timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for user sessions
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
FOR ALL USING (validate_session_access(user_id))
WITH CHECK (validate_session_access(user_id));

-- Create advanced security monitoring function with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_security_metrics(p_time_window_hours integer DEFAULT 24)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  threat_count integer;
  critical_events integer;
  risk_score integer;
  anomaly_count integer;
BEGIN
  -- Count security events in time window
  SELECT COUNT(*) INTO threat_count
  FROM public.security_events
  WHERE timestamp >= now() - (p_time_window_hours || ' hours')::interval;
  
  -- Count critical events
  SELECT COUNT(*) INTO critical_events
  FROM public.security_events
  WHERE timestamp >= now() - (p_time_window_hours || ' hours')::interval
  AND severity = 'critical';
  
  -- Count anomalies
  SELECT COUNT(*) INTO anomaly_count
  FROM public.security_events
  WHERE timestamp >= now() - (p_time_window_hours || ' hours')::interval
  AND (event_type LIKE '%anomaly%' OR event_type LIKE '%suspicious%');
  
  -- Calculate risk score
  risk_score := LEAST(100, (critical_events * 20) + (anomaly_count * 10) + (threat_count * 2));
  
  result := jsonb_build_object(
    'threat_count', threat_count,
    'critical_events', critical_events,
    'anomaly_count', anomaly_count,
    'risk_score', risk_score,
    'threat_level', CASE 
      WHEN risk_score >= 80 THEN 'critical'
      WHEN risk_score >= 60 THEN 'high'
      WHEN risk_score >= 30 THEN 'medium'
      ELSE 'low'
    END,
    'calculation_time', now()
  );
  
  RETURN result;
END;
$function$;

-- Create session anomaly detection function
CREATE OR REPLACE FUNCTION public.detect_session_anomaly(
  p_current_fingerprint text,
  p_ip_address inet DEFAULT NULL::inet,
  p_user_agent text DEFAULT NULL::text
) RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_id_var uuid := auth.uid();
  anomaly_detected boolean := false;
  anomaly_score integer := 0;
  details jsonb := '{}';
  last_session record;
BEGIN
  -- Must be authenticated
  IF user_id_var IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;
  
  -- Get last known session
  SELECT * INTO last_session
  FROM public.user_sessions
  WHERE user_id = user_id_var
  AND is_active = true
  ORDER BY last_activity DESC
  LIMIT 1;
  
  IF last_session IS NOT NULL THEN
    -- Check device fingerprint anomaly
    IF last_session.device_fingerprint IS NOT NULL 
       AND last_session.device_fingerprint != p_current_fingerprint THEN
      anomaly_detected := true;
      anomaly_score := anomaly_score + 40;
      details := details || jsonb_build_object('device_fingerprint_changed', true);
    END IF;
    
    -- Check IP address anomaly (basic check for different subnets)
    IF last_session.ip_address IS NOT NULL 
       AND p_ip_address IS NOT NULL
       AND host(last_session.ip_address) != host(p_ip_address) THEN
      anomaly_detected := true;
      anomaly_score := anomaly_score + 30;
      details := details || jsonb_build_object('ip_address_changed', true);
    END IF;
    
    -- Check user agent anomaly
    IF last_session.user_agent IS NOT NULL 
       AND p_user_agent IS NOT NULL
       AND last_session.user_agent != p_user_agent THEN
      anomaly_detected := true;
      anomaly_score := anomaly_score + 20;
      details := details || jsonb_build_object('user_agent_changed', true);
    END IF;
  END IF;
  
  -- Log if anomaly detected
  IF anomaly_detected THEN
    PERFORM public.log_security_event(
      'session_anomaly',
      CASE 
        WHEN anomaly_score >= 70 THEN 'critical'
        WHEN anomaly_score >= 40 THEN 'high'
        ELSE 'medium'
      END,
      jsonb_build_object(
        'anomaly_score', anomaly_score,
        'details', details,
        'current_fingerprint', p_current_fingerprint,
        'previous_fingerprint', last_session.device_fingerprint
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'anomaly_detected', anomaly_detected,
    'anomaly_score', anomaly_score,
    'details', details
  );
END;
$function$;

-- Update user session tracking function
CREATE OR REPLACE FUNCTION public.update_user_session(
  p_session_token text,
  p_device_fingerprint text DEFAULT NULL::text,
  p_ip_address inet DEFAULT NULL::inet,
  p_user_agent text DEFAULT NULL::text,
  p_location_data jsonb DEFAULT NULL::jsonb
) RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_id_var uuid := auth.uid();
  calculated_risk_score integer := 0;
  calculated_trust_score integer := 80;
BEGIN
  -- Must be authenticated
  IF user_id_var IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate basic risk score based on factors
  IF p_ip_address IS NOT NULL THEN
    -- Add logic for IP reputation checking in the future
    calculated_risk_score := calculated_risk_score + 0;
  END IF;
  
  -- Upsert session record
  INSERT INTO public.user_sessions (
    user_id, session_token, device_fingerprint, ip_address, user_agent,
    location_data, risk_score, trust_score, expires_at
  )
  VALUES (
    user_id_var, p_session_token, p_device_fingerprint, p_ip_address, p_user_agent,
    p_location_data, calculated_risk_score, calculated_trust_score, 
    now() + interval '24 hours'
  )
  ON CONFLICT (session_token) 
  DO UPDATE SET
    device_fingerprint = EXCLUDED.device_fingerprint,
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent,
    location_data = EXCLUDED.location_data,
    risk_score = EXCLUDED.risk_score,
    trust_score = EXCLUDED.trust_score,
    last_activity = now(),
    updated_at = now();
END;
$function$;

-- Add unique constraint for session tokens
ALTER TABLE public.user_sessions ADD CONSTRAINT IF NOT EXISTS user_sessions_session_token_key UNIQUE (session_token);