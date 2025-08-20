-- Create additional security functions for comprehensive monitoring
-- Add rate limiting function for edge functions
CREATE OR REPLACE FUNCTION public.check_edge_function_rate_limit(
  p_function_name text,
  p_identifier text, 
  p_max_requests integer DEFAULT 100,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_count integer;
BEGIN
  -- Count recent requests from this identifier for this function
  SELECT COUNT(*) INTO request_count
  FROM public.security_events se
  WHERE se.event_type = 'edge_function_request'
  AND se.details->>'function_name' = p_function_name
  AND se.details->>'identifier' = p_identifier
  AND se.timestamp > (now() - (p_window_minutes || ' minutes')::interval);
  
  -- Return true if under limit, false if over limit
  IF request_count >= p_max_requests THEN
    -- Log rate limit violation
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      'medium',
      jsonb_build_object(
        'function_name', p_function_name,
        'identifier', p_identifier,
        'request_count', request_count,
        'limit', p_max_requests,
        'window_minutes', p_window_minutes
      )
    );
    RETURN false;
  END IF;
  
  -- Log the request for rate limiting tracking
  PERFORM public.log_security_event(
    'edge_function_request',
    'low',
    jsonb_build_object(
      'function_name', p_function_name,
      'identifier', p_identifier
    )
  );
  
  RETURN true;
END;
$$;

-- Create enhanced security metrics calculation function
CREATE OR REPLACE FUNCTION public.calculate_security_metrics(p_time_window_hours integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  threat_level text;
  risk_score integer;
  critical_count integer;
  high_count integer;
  medium_count integer;
  suspicious_activity_count integer;
  last_security_event timestamp with time zone;
BEGIN
  -- Count security events by severity in time window
  SELECT 
    COUNT(*) FILTER (WHERE severity = 'critical'),
    COUNT(*) FILTER (WHERE severity = 'high'), 
    COUNT(*) FILTER (WHERE severity = 'medium'),
    COUNT(*) FILTER (WHERE event_type LIKE '%suspicious%' OR event_type LIKE '%unauthorized%'),
    MAX(timestamp)
  INTO critical_count, high_count, medium_count, suspicious_activity_count, last_security_event
  FROM public.security_events
  WHERE timestamp > (now() - (p_time_window_hours || ' hours')::interval);
  
  -- Calculate risk score (0-100)
  risk_score := LEAST(100, 
    (critical_count * 25) + 
    (high_count * 10) + 
    (medium_count * 5) + 
    (suspicious_activity_count * 2)
  );
  
  -- Determine threat level
  IF critical_count > 0 OR risk_score >= 75 THEN
    threat_level := 'critical';
  ELSIF high_count > 2 OR risk_score >= 50 THEN
    threat_level := 'high';
  ELSIF medium_count > 5 OR risk_score >= 25 THEN
    threat_level := 'medium';
  ELSE
    threat_level := 'low';
  END IF;
  
  RETURN jsonb_build_object(
    'threat_level', threat_level,
    'risk_score', risk_score,
    'last_security_event', last_security_event,
    'suspicious_activity_count', suspicious_activity_count,
    'event_counts', jsonb_build_object(
      'critical', critical_count,
      'high', high_count,
      'medium', medium_count,
      'suspicious', suspicious_activity_count
    ),
    'calculated_at', now()
  );
END;
$$;

-- Create session anomaly detection function
CREATE OR REPLACE FUNCTION public.detect_session_anomaly(
  p_user_id uuid,
  p_current_fingerprint text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stored_fingerprint text;
  fingerprint_match boolean := false;
  anomaly_detected boolean := false;
  anomaly_reasons jsonb := '[]'::jsonb;
BEGIN
  -- Get stored device fingerprint from user preferences or security table
  -- This is a simplified version - in production you'd have a proper session table
  SELECT details->>'device_fingerprint' INTO stored_fingerprint
  FROM public.security_events
  WHERE user_id = p_user_id 
  AND event_type = 'session_fingerprint_stored'
  ORDER BY timestamp DESC
  LIMIT 1;
  
  -- Check fingerprint match
  IF stored_fingerprint IS NOT NULL THEN
    fingerprint_match := stored_fingerprint = p_current_fingerprint;
    
    IF NOT fingerprint_match THEN
      anomaly_detected := true;
      anomaly_reasons := anomaly_reasons || jsonb_build_array('fingerprint_mismatch');
    END IF;
  END IF;
  
  -- Check for multiple rapid sessions (basic detection)
  IF EXISTS (
    SELECT 1 FROM public.security_events
    WHERE user_id = p_user_id
    AND event_type = 'session_validation'
    AND timestamp > (now() - interval '5 minutes')
    GROUP BY details->>'ip_address'
    HAVING COUNT(*) > 3
  ) THEN
    anomaly_detected := true;
    anomaly_reasons := anomaly_reasons || jsonb_build_array('rapid_session_changes');
  END IF;
  
  -- Log the session validation
  PERFORM public.log_security_event(
    'session_validation',
    CASE WHEN anomaly_detected THEN 'high' ELSE 'low' END,
    jsonb_build_object(
      'fingerprint_match', fingerprint_match,
      'anomaly_detected', anomaly_detected,
      'anomaly_reasons', anomaly_reasons,
      'ip_address', p_ip_address,
      'user_agent', p_user_agent
    )
  );
  
  RETURN jsonb_build_object(
    'anomaly_detected', anomaly_detected,
    'fingerprint_match', fingerprint_match,
    'anomaly_reasons', anomaly_reasons,
    'risk_level', CASE 
      WHEN anomaly_detected THEN 'high'
      WHEN NOT fingerprint_match THEN 'medium'
      ELSE 'low'
    END
  );
END;
$$;