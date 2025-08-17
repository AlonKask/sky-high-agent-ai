-- Phase 1: Critical Security Hardening

-- 1. Strengthen RLS for sensitive tables with enhanced security
DROP POLICY IF EXISTS "ULTRA_SECURE_clients_select" ON public.clients;
DROP POLICY IF EXISTS "ULTRA_SECURE_clients_insert" ON public.clients;
DROP POLICY IF EXISTS "ULTRA_SECURE_clients_update" ON public.clients;
DROP POLICY IF EXISTS "ULTRA_SECURE_clients_delete" ON public.clients;

-- Enhanced client data protection with audit logging
CREATE POLICY "MAXIMUM_SECURITY_clients_select" ON public.clients
FOR SELECT USING (
  auth.uid() IS NOT NULL AND 
  (auth.uid() = user_id OR can_access_client_data_secure(user_id))
);

CREATE POLICY "MAXIMUM_SECURITY_clients_insert" ON public.clients
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id AND
  email IS NOT NULL AND
  first_name IS NOT NULL AND
  last_name IS NOT NULL AND
  length(TRIM(first_name)) >= 1 AND
  length(TRIM(last_name)) >= 1 AND
  email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

CREATE POLICY "MAXIMUM_SECURITY_clients_update" ON public.clients
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
) WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

CREATE POLICY "MAXIMUM_SECURITY_clients_delete" ON public.clients
FOR DELETE USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- 2. Enhanced Gmail credentials security
DROP POLICY IF EXISTS "Authenticated users: gmail INSERT" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Authenticated users: gmail DELETE" ON public.gmail_credentials;

CREATE POLICY "ULTRA_SECURE_gmail_insert" ON public.gmail_credentials
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id AND
  access_token_encrypted IS NOT NULL AND
  refresh_token_encrypted IS NOT NULL
);

CREATE POLICY "ULTRA_SECURE_gmail_select" ON public.gmail_credentials
FOR SELECT USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

CREATE POLICY "ULTRA_SECURE_gmail_update" ON public.gmail_credentials
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
) WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

CREATE POLICY "ULTRA_SECURE_gmail_delete" ON public.gmail_credentials
FOR DELETE USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- 3. Secure email exchanges table
CREATE POLICY "SECURE_email_exchanges_select" ON public.email_exchanges
FOR SELECT USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

CREATE POLICY "SECURE_email_exchanges_insert" ON public.email_exchanges
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

CREATE POLICY "SECURE_email_exchanges_update" ON public.email_exchanges
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
) WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

CREATE POLICY "SECURE_email_exchanges_delete" ON public.email_exchanges
FOR DELETE USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- 4. Enhanced security monitoring function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text DEFAULT 'medium',
  p_details jsonb DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details,
    ip_address,
    user_agent,
    timestamp
  ) VALUES (
    auth.uid(),
    p_event_type,
    p_severity,
    p_details || jsonb_build_object(
      'session_id', COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'session_id', 'unknown'),
      'user_role', COALESCE((SELECT role FROM public.user_roles WHERE user_id = auth.uid()), 'none')
    ),
    inet(COALESCE(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', '127.0.0.1')),
    COALESCE(current_setting('request.headers', true)::jsonb->>'user-agent', 'unknown'),
    now()
  );
END;
$$;

-- 5. Enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.advanced_rate_limit_check(
  p_identifier text,
  p_endpoint text,
  p_ip_address text DEFAULT NULL,
  p_max_requests integer DEFAULT 10,
  p_window_minutes integer DEFAULT 15
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start timestamp with time zone;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Clean up old entries
  DELETE FROM public.access_rate_limits 
  WHERE window_start < now() - interval '2 hours';
  
  -- Get current request count
  SELECT COALESCE(SUM(request_count), 0) 
  INTO current_count
  FROM public.access_rate_limits
  WHERE identifier = p_identifier 
  AND endpoint = p_endpoint
  AND window_start > window_start;
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      'critical',
      jsonb_build_object(
        'identifier', p_identifier,
        'endpoint', p_endpoint,
        'ip_address', p_ip_address,
        'current_count', current_count,
        'max_requests', p_max_requests,
        'window_minutes', p_window_minutes
      )
    );
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO public.access_rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, GREATEST(window_start, now()))
  ON CONFLICT (identifier, endpoint) 
  DO UPDATE SET 
    request_count = access_rate_limits.request_count + 1,
    window_start = CASE 
      WHEN access_rate_limits.window_start < now() - (p_window_minutes || ' minutes')::interval 
      THEN now() 
      ELSE access_rate_limits.window_start 
    END;
  
  RETURN true;
END;
$$;

-- 6. Session anomaly detection function
CREATE OR REPLACE FUNCTION public.detect_session_anomaly(
  p_current_fingerprint text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id uuid := auth.uid();
  anomaly_score integer := 0;
  result jsonb;
BEGIN
  IF user_id IS NULL THEN
    RETURN jsonb_build_object(
      'anomaly_detected', true,
      'anomaly_score', 100,
      'requires_verification', true,
      'force_logout', true,
      'reason', 'unauthenticated_access'
    );
  END IF;
  
  -- Check for rapid IP changes (simplified check)
  IF p_ip_address IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.security_events 
      WHERE user_id = user_id 
      AND event_type = 'login_success'
      AND details->>'ip_address' != p_ip_address
      AND timestamp > now() - interval '1 hour'
    ) THEN
      anomaly_score := anomaly_score + 30;
    END IF;
  END IF;
  
  -- Check for unusual activity patterns
  IF EXISTS (
    SELECT 1 FROM public.security_events 
    WHERE user_id = user_id 
    AND severity = 'high'
    AND timestamp > now() - interval '24 hours'
  ) THEN
    anomaly_score := anomaly_score + 40;
  END IF;
  
  result := jsonb_build_object(
    'anomaly_detected', anomaly_score > 50,
    'anomaly_score', anomaly_score,
    'requires_verification', anomaly_score > 30,
    'force_logout', anomaly_score > 80,
    'timestamp', now()
  );
  
  -- Log the anomaly check
  PERFORM public.log_security_event(
    'session_anomaly_check',
    CASE 
      WHEN anomaly_score > 80 THEN 'critical'
      WHEN anomaly_score > 50 THEN 'high'
      WHEN anomaly_score > 30 THEN 'medium'
      ELSE 'low'
    END,
    result || jsonb_build_object('user_agent', p_user_agent, 'fingerprint', p_current_fingerprint)
  );
  
  RETURN result;
END;
$$;

-- 7. Calculate security metrics function
CREATE OR REPLACE FUNCTION public.calculate_security_metrics(
  p_time_window_hours integer DEFAULT 24
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  threat_level text;
  risk_score integer;
  critical_events integer;
  high_events integer;
  medium_events integer;
  low_events integer;
BEGIN
  -- Count events by severity
  SELECT 
    COUNT(*) FILTER (WHERE severity = 'critical'),
    COUNT(*) FILTER (WHERE severity = 'high'),
    COUNT(*) FILTER (WHERE severity = 'medium'),
    COUNT(*) FILTER (WHERE severity = 'low')
  INTO critical_events, high_events, medium_events, low_events
  FROM public.security_events
  WHERE timestamp > now() - (p_time_window_hours || ' hours')::interval;
  
  -- Calculate risk score
  risk_score := (critical_events * 40) + (high_events * 20) + (medium_events * 5) + (low_events * 1);
  
  -- Determine threat level
  threat_level := CASE 
    WHEN risk_score > 200 THEN 'critical'
    WHEN risk_score > 100 THEN 'high'
    WHEN risk_score > 50 THEN 'medium'
    ELSE 'low'
  END;
  
  result := jsonb_build_object(
    'threat_level', threat_level,
    'risk_score', risk_score,
    'critical_events', critical_events,
    'high_events', high_events,
    'medium_events', medium_events,
    'low_events', low_events,
    'total_events', critical_events + high_events + medium_events + low_events,
    'calculation_time', now(),
    'time_window_hours', p_time_window_hours
  );
  
  RETURN result;
END;
$$;