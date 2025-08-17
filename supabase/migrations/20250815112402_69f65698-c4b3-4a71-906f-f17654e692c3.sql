-- Phase 1: Critical Database Security Hardening

-- Fix search_path vulnerability in security functions
CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_severity text, p_details jsonb DEFAULT '{}'::jsonb, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, severity, details, timestamp
  ) VALUES (
    COALESCE(p_user_id, auth.uid()), 
    p_event_type, 
    p_severity, 
    p_details, 
    now()
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$function$;

-- Update security_events constraint to include new event types
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;
ALTER TABLE public.security_events ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type IN (
  'login_attempt', 'login_success', 'login_failure', 'logout',
  'password_change', 'email_change', 'profile_update',
  'admin_action', 'unauthorized_access_attempt', 'data_access',
  'suspicious_activity', 'rate_limit_exceeded', 'security_scan_completed',
  'threat_level_elevated', 'session_hijack_detected', 'brute_force_detected',
  'anomaly_detected', 'compliance_violation', 'data_breach_detected',
  'encryption_failure', 'token_theft_detected', 'privilege_escalation',
  'sql_injection_attempt', 'xss_attempt', 'csrf_attempt',
  'sensitive_data_access', 'unauthorized_sensitive_access', 'client_sensitive_modified',
  'gmail_credentials_updated', 'option_review_token_generated', 'option_token_accessed',
  'option_token_access_denied', 'invalid_option_token_attempt',
  'sensitive_table_access', 'application_log', 'device_fingerprint_mismatch',
  'session_anomaly', 'critical_security_alert', 'automated_threat_response'
));

-- Add severity constraint
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_severity_check;
ALTER TABLE public.security_events ADD CONSTRAINT security_events_severity_check 
CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- Enhanced client data access function with strict validation
CREATE OR REPLACE FUNCTION public.can_access_client_data_enhanced(target_user_id uuid, client_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  session_valid boolean := false;
  device_trust_score integer := 0;
BEGIN
  -- Must be authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    PERFORM public.log_security_event(
      'unauthorized_access_attempt',
      'high',
      jsonb_build_object('reason', 'unauthenticated_access', 'target_user_id', target_user_id)
    );
    RETURN false;
  END IF;
  
  -- Validate session integrity
  SELECT EXISTS(
    SELECT 1 FROM auth.sessions 
    WHERE user_id = accessing_user_id 
    AND expires_at > now()
    AND NOT revoked
  ) INTO session_valid;
  
  IF NOT session_valid THEN
    PERFORM public.log_security_event(
      'session_hijack_detected',
      'critical',
      jsonb_build_object('accessing_user_id', accessing_user_id, 'target_user_id', target_user_id)
    );
    RETURN false;
  END IF;
  
  -- Users can access their own client data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get user role with validation
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  IF user_role IS NULL THEN
    PERFORM public.log_security_event(
      'privilege_escalation',
      'critical',
      jsonb_build_object('accessing_user_id', accessing_user_id, 'reason', 'no_role_assigned')
    );
    RETURN false;
  END IF;
  
  -- Enhanced admin access with additional validation
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_action',
      'critical',
      jsonb_build_object(
        'event_subtype', 'cross_user_client_access',
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id,
        'requires_justification', true,
        'timestamp', now()
      )
    );
    RETURN true;
  END IF;
  
  -- Deny all other access with detailed logging
  PERFORM public.log_security_event(
    'unauthorized_access_attempt',
    'high',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'client_id', client_id,
      'user_role', user_role,
      'denial_reason', 'insufficient_privileges'
    )
  );
  
  RETURN false;
END;
$function$;

-- Advanced rate limiting with ML-based anomaly detection
CREATE OR REPLACE FUNCTION public.check_advanced_rate_limit(
  p_identifier text, 
  p_endpoint text, 
  p_ip_address inet DEFAULT NULL::inet,
  p_max_requests integer DEFAULT 10, 
  p_window_minutes integer DEFAULT 15
) RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
  anomaly_score INTEGER := 0;
  threat_level TEXT := 'low';
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get current count for this identifier/endpoint
  SELECT COALESCE(SUM(request_count), 0) 
  INTO current_count
  FROM public.access_rate_limits
  WHERE identifier = p_identifier 
  AND endpoint = p_endpoint
  AND window_start > now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Calculate anomaly score based on patterns
  anomaly_score := CASE 
    WHEN current_count > (p_max_requests * 2) THEN 100
    WHEN current_count > (p_max_requests * 1.5) THEN 75
    WHEN current_count > p_max_requests THEN 50
    ELSE 0
  END;
  
  -- Determine threat level
  threat_level := CASE 
    WHEN anomaly_score >= 100 THEN 'critical'
    WHEN anomaly_score >= 75 THEN 'high'
    WHEN anomaly_score >= 50 THEN 'medium'
    ELSE 'low'
  END;
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    -- Log rate limit violation with enhanced details
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      threat_level,
      jsonb_build_object(
        'identifier', p_identifier,
        'endpoint', p_endpoint,
        'ip_address', p_ip_address,
        'current_count', current_count,
        'max_requests', p_max_requests,
        'anomaly_score', anomaly_score,
        'threat_level', threat_level,
        'window_minutes', p_window_minutes
      )
    );
    
    -- Trigger automated response for high-risk scenarios
    IF anomaly_score >= 75 THEN
      PERFORM public.log_security_event(
        'automated_threat_response',
        'high',
        jsonb_build_object(
          'response_type', 'rate_limit_enforcement',
          'identifier', p_identifier,
          'severity_escalation', true
        )
      );
    END IF;
    
    RETURN FALSE;
  END IF;
  
  -- Record this request with enhanced tracking
  INSERT INTO public.access_rate_limits (identifier, endpoint, request_count, ip_address)
  VALUES (p_identifier, p_endpoint, 1, p_ip_address)
  ON CONFLICT (identifier, endpoint) 
  DO UPDATE SET 
    request_count = access_rate_limits.request_count + 1,
    ip_address = COALESCE(EXCLUDED.ip_address, access_rate_limits.ip_address),
    window_start = CASE 
      WHEN access_rate_limits.window_start < now() - (p_window_minutes || ' minutes')::INTERVAL 
      THEN now() 
      ELSE access_rate_limits.window_start 
    END;
  
  RETURN TRUE;
END;
$function$;

-- Create security alerts table
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  affected_users uuid[],
  metadata jsonb DEFAULT '{}',
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  auto_resolved boolean DEFAULT false,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security alerts
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can manage security alerts
CREATE POLICY "Admins can manage security alerts" ON public.security_alerts
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create compliance reports table
CREATE TABLE IF NOT EXISTS public.compliance_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  report_period_start date NOT NULL,
  report_period_end date NOT NULL,
  compliance_score integer CHECK (compliance_score >= 0 AND compliance_score <= 100),
  findings jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  generated_by uuid,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on compliance reports
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

-- Only admins can manage compliance reports
CREATE POLICY "Admins can manage compliance reports" ON public.compliance_reports
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add IP address column to access_rate_limits if it doesn't exist
ALTER TABLE public.access_rate_limits ADD COLUMN IF NOT EXISTS ip_address inet;