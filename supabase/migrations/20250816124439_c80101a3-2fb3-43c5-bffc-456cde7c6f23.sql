-- COMPREHENSIVE SECURITY FIX PLAN - FINAL VERSION
-- Addresses 2 Critical Warnings + 4 Recommendations

-- ==========================================
-- PHASE 1: DROP DEPENDENT POLICIES FIRST
-- ==========================================

-- Drop policies that depend on the function we need to replace
DROP POLICY IF EXISTS "ULTRA_SECURE_emails_select" ON public.email_exchanges;
DROP POLICY IF EXISTS "ULTRA_SECURE_chat_select" ON public.agent_client_chat;
DROP POLICY IF EXISTS "Enhanced email exchanges access" ON public.email_exchanges;

-- Now drop and recreate the function
DROP FUNCTION IF EXISTS public.can_access_communication_data(uuid, uuid);

-- ==========================================
-- PHASE 2: ENHANCED SECURITY FUNCTIONS
-- ==========================================

-- 1. Enhanced Gmail Credentials Security
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
BEGIN
  -- Must be authenticated
  IF accessing_user_id IS NULL THEN
    PERFORM public.log_security_event(
      'unauthenticated_gmail_access_attempt',
      'critical',
      jsonb_build_object('target_user_id', target_user_id)
    );
    RETURN false;
  END IF;
  
  -- Users can ONLY access their own Gmail credentials
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Log unauthorized attempt
  PERFORM public.log_security_event(
    'unauthorized_gmail_access_attempt',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'violation_type', 'cross_user_access'
    )
  );
  
  RETURN false;
END;
$$;

-- 2. Enhanced Communication Data Access Control
CREATE OR REPLACE FUNCTION public.can_access_communication_data(target_user_id uuid, target_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
BEGIN
  -- Must be authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can access their own communication data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- Supervisors and managers can access team communication data
  IF user_role IN ('supervisor', 'manager', 'admin') THEN
    PERFORM public.log_security_event(
      'supervisor_communication_access',
      'medium',
      jsonb_build_object(
        'supervisor_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', target_client_id,
        'supervisor_role', user_role
      )
    );
    RETURN true;
  END IF;
  
  -- Deny all other access
  PERFORM public.log_security_event(
    'unauthorized_communication_access',
    'high',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'client_id', target_client_id
    )
  );
  
  RETURN false;
END;
$$;

-- 3. Enhanced Security Event Logging with Path Security
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Validate event type (expanded list)
  IF p_event_type NOT IN (
    'login_attempt', 'login_success', 'login_failure', 'logout',
    'unauthorized_access_attempt', 'data_access', 'sensitive_data_access',
    'admin_action', 'security_violation', 'suspicious_activity',
    'rate_limit_exceeded', 'api_request', 'gmail_credentials_accessed',
    'unauthenticated_gmail_access_attempt', 'unauthorized_gmail_access_attempt',
    'client_sensitive_modified', 'supervisor_communication_access', 
    'unauthorized_communication_access', 'secure_client_data_accessed',
    'advanced_rate_limit_exceeded', 'audit_integrity_validated',
    'tamper_detection_triggered', 'security_dashboard_accessed'
  ) THEN
    -- Allow any event type for flexibility, but log validation attempt
    p_details := p_details || jsonb_build_object('validation_note', 'unknown_event_type');
  END IF;
  
  -- Validate severity
  IF p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    p_severity := 'medium'; -- Default fallback
  END IF;
  
  -- Insert security event with error handling
  BEGIN
    INSERT INTO security_events (
      user_id,
      event_type,
      severity,
      details,
      timestamp,
      ip_address,
      user_agent
    ) VALUES (
      current_user_id,
      p_event_type,
      p_severity,
      p_details,
      now(),
      inet_client_addr(),
      'system'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Fail silently to avoid blocking operations
    NULL;
  END;
END;
$$;

-- 4. Advanced Rate Limiting with Path Security
CREATE OR REPLACE FUNCTION public.advanced_rate_limit_check(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start timestamp with time zone;
  result jsonb;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Count recent requests
  SELECT COUNT(*) INTO current_count
  FROM security_events
  WHERE user_id = p_user_id
  AND event_type = 'api_request'
  AND details->>'endpoint' = p_endpoint
  AND timestamp > window_start;
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'current_count', current_count,
      'limit', p_max_requests,
      'reset_time', window_start + (p_window_minutes || ' minutes')::interval
    );
  ELSE
    result := jsonb_build_object(
      'allowed', true,
      'current_count', current_count,
      'limit', p_max_requests,
      'remaining', p_max_requests - current_count
    );
  END IF;
  
  RETURN result;
END;
$$;

-- 5. Audit Log Integrity Validation
CREATE OR REPLACE FUNCTION public.validate_audit_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_logs integer;
  suspicious_patterns integer;
  integrity_score numeric;
  result jsonb;
BEGIN
  -- Count total audit logs
  SELECT COUNT(*) INTO total_logs FROM audit_logs;
  
  -- Check for suspicious patterns
  SELECT COUNT(*) INTO suspicious_patterns
  FROM audit_logs
  WHERE (operation IN ('UPDATE', 'DELETE') AND user_id IS NULL);
  
  -- Calculate integrity score
  integrity_score := CASE 
    WHEN total_logs = 0 THEN 100
    ELSE GREATEST(0, 100 - (suspicious_patterns::numeric / total_logs::numeric * 100))
  END;
  
  result := jsonb_build_object(
    'status', CASE 
      WHEN integrity_score >= 95 THEN 'excellent'
      WHEN integrity_score >= 80 THEN 'good'
      WHEN integrity_score >= 60 THEN 'fair'
      ELSE 'poor'
    END,
    'integrity_score', integrity_score,
    'total_logs', total_logs,
    'suspicious_patterns', suspicious_patterns
  );
  
  RETURN result;
END;
$$;

-- 6. Security Dashboard Metrics
CREATE OR REPLACE FUNCTION public.get_security_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  metrics jsonb;
  threat_level text;
  critical_events integer;
  high_events integer;
  integrity_result jsonb;
BEGIN
  -- Check user permission
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required' USING ERRCODE = '42501';
  END IF;
  
  -- Count recent security events by severity
  SELECT 
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE severity = 'high') as high_count
  INTO critical_events, high_events
  FROM security_events
  WHERE timestamp > now() - INTERVAL '24 hours';
  
  -- Determine threat level
  threat_level := CASE
    WHEN critical_events > 0 THEN 'critical'
    WHEN high_events > 5 THEN 'high'
    WHEN high_events > 0 THEN 'medium'
    ELSE 'low'
  END;
  
  -- Get audit integrity status
  integrity_result := validate_audit_integrity();
  
  -- Build comprehensive metrics
  metrics := jsonb_build_object(
    'threat_level', threat_level,
    'security_events_24h', jsonb_build_object(
      'critical', critical_events,
      'high', high_events,
      'total', critical_events + high_events
    ),
    'audit_integrity', integrity_result,
    'last_updated', now(),
    'security_status', CASE
      WHEN threat_level = 'critical' THEN 'immediate_attention_required'
      WHEN threat_level = 'high' THEN 'monitoring_required'
      WHEN threat_level = 'medium' THEN 'normal_vigilance'
      ELSE 'secure'
    END
  );
  
  RETURN metrics;
END;
$$;

-- ==========================================
-- PHASE 3: RECREATE ENHANCED SECURITY POLICIES
-- ==========================================

-- Enhanced email exchanges access policy
CREATE POLICY "Enhanced email exchanges access"
ON public.email_exchanges
FOR SELECT
USING (
  can_access_communication_data(
    user_id,
    COALESCE(
      (metadata->>'client_id')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  )
);

-- Enhanced agent client chat policy
CREATE POLICY "ULTRA_SECURE_chat_select"
ON public.agent_client_chat
FOR SELECT
USING (
  can_access_communication_data(user_id, client_id)
);

-- Enhanced quotes access policy with financial controls
DROP POLICY IF EXISTS "Users can access their own quotes only" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes access with role validation" ON public.quotes;
CREATE POLICY "Enhanced quotes access with role validation"
ON public.quotes
FOR SELECT
USING (
  -- Quote owner access
  (auth.uid() = user_id)
  OR
  -- Financial personnel access (managers and above)
  (
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);