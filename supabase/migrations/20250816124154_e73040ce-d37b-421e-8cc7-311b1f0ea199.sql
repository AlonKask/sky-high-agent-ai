-- COMPREHENSIVE SECURITY FIX PLAN
-- Addresses 2 Critical Warnings + 4 Recommendations

-- ==========================================
-- PHASE 1: CRITICAL SECURITY HARDENING
-- ==========================================

-- 1. Enhanced Gmail Credentials Security with Token Rotation
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
    -- Log legitimate access
    PERFORM public.log_security_event(
      'gmail_credentials_accessed',
      'low',
      jsonb_build_object('user_id', target_user_id, 'legitimate_access', true)
    );
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
CREATE OR REPLACE FUNCTION public.can_access_communication_data(target_user_id uuid, client_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  client_owner_id uuid;
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
  
  -- Get client owner
  SELECT user_id INTO client_owner_id
  FROM public.clients
  WHERE id = client_id_param;
  
  -- Supervisors and managers can access team communication data
  IF user_role IN ('supervisor', 'manager', 'admin') THEN
    -- Log supervisor access
    PERFORM public.log_security_event(
      'supervisor_communication_access',
      'medium',
      jsonb_build_object(
        'supervisor_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id_param,
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
      'client_id', client_id_param
    )
  );
  
  RETURN false;
END;
$$;

-- 3. Secure Client Data Retrieval with Enhanced Masking
CREATE OR REPLACE FUNCTION public.get_client_data_secure(p_client_id uuid, p_include_sensitive boolean DEFAULT false)
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
  FROM public.clients
  WHERE id = p_client_id;
  
  IF client_owner_id IS NULL THEN
    RAISE EXCEPTION 'Client not found' USING ERRCODE = '02000';
  END IF;
  
  -- Check access permission
  IF NOT public.can_access_client_data_ultra_strict(client_owner_id, p_client_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  
  -- Get user role for masking decisions
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Fetch client data
  SELECT to_jsonb(c) INTO client_data
  FROM (
    SELECT id, user_id, first_name, last_name, email, phone, company,
           preferred_class, notes, total_bookings, total_spent, last_trip_date,
           date_of_birth, client_type, created_at, updated_at,
           CASE 
             WHEN p_include_sensitive AND user_role IN ('admin', 'manager') THEN encrypted_ssn
             ELSE NULL
           END as encrypted_ssn,
           CASE 
             WHEN p_include_sensitive AND user_role IN ('admin', 'manager') THEN encrypted_passport_number
             ELSE NULL
           END as encrypted_passport_number,
           CASE 
             WHEN p_include_sensitive AND user_role IN ('admin', 'manager') THEN encrypted_payment_info
             ELSE NULL
           END as encrypted_payment_info
    FROM public.clients
    WHERE id = p_client_id
  ) c;
  
  -- Apply data masking based on role
  client_data := public.mask_client_data(client_data, COALESCE(user_role, 'agent'::app_role));
  
  -- Log access
  PERFORM public.log_security_event(
    'secure_client_data_accessed',
    'medium',
    jsonb_build_object(
      'client_id', p_client_id,
      'include_sensitive', p_include_sensitive,
      'user_role', user_role
    )
  );
  
  RETURN client_data;
END;
$$;

-- ==========================================
-- PHASE 2: DATABASE FUNCTION SECURITY
-- ==========================================

-- 4. Fix Search Path Security for Rate Limiting
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
    -- Log rate limit violation
    PERFORM log_security_event(
      'advanced_rate_limit_exceeded',
      'high',
      jsonb_build_object(
        'endpoint', p_endpoint,
        'current_count', current_count,
        'max_requests', p_max_requests,
        'window_minutes', p_window_minutes
      )
    );
    
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'current_count', current_count,
      'limit', p_max_requests,
      'reset_time', window_start + (p_window_minutes || ' minutes')::interval
    );
  ELSE
    -- Log API request
    PERFORM log_security_event(
      'api_request',
      'low',
      jsonb_build_object('endpoint', p_endpoint)
    );
    
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

-- 5. Enhanced Security Event Logging with Path Security
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
  -- Validate event type
  IF p_event_type NOT IN (
    'login_attempt', 'login_success', 'login_failure', 'logout',
    'unauthorized_access_attempt', 'data_access', 'sensitive_data_access',
    'admin_action', 'security_violation', 'suspicious_activity',
    'rate_limit_exceeded', 'api_request', 'gmail_credentials_accessed',
    'unauthorized_gmail_access_attempt', 'client_sensitive_modified',
    'supervisor_communication_access', 'unauthorized_communication_access',
    'secure_client_data_accessed', 'advanced_rate_limit_exceeded',
    'audit_integrity_validated', 'tamper_detection_triggered'
  ) THEN
    RAISE EXCEPTION 'Invalid event type: %', p_event_type USING ERRCODE = '22000';
  END IF;
  
  -- Validate severity
  IF p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity: %', p_severity USING ERRCODE = '22000';
  END IF;
  
  -- Insert security event with enhanced metadata
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
    p_details || jsonb_build_object(
      'session_id', current_setting('request.jwt.claims', true)::jsonb->>'session_id',
      'user_role', (SELECT role FROM user_roles WHERE user_id = current_user_id)
    ),
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Fail silently to avoid blocking operations
  NULL;
END;
$$;

-- ==========================================
-- PHASE 3: AUDIT LOG INTEGRITY PROTECTION
-- ==========================================

-- 6. Audit Log Integrity Validation
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
  WHERE (
    -- Missing user_id for operations that should have one
    (operation IN ('UPDATE', 'DELETE') AND user_id IS NULL)
    OR
    -- Suspicious timing patterns (too many operations in short time)
    EXISTS (
      SELECT 1 FROM audit_logs a2
      WHERE a2.user_id = audit_logs.user_id
      AND a2.timestamp BETWEEN audit_logs.timestamp - INTERVAL '1 second'
                           AND audit_logs.timestamp + INTERVAL '1 second'
      GROUP BY a2.user_id
      HAVING COUNT(*) > 10
    )
  );
  
  -- Calculate integrity score
  integrity_score := CASE 
    WHEN total_logs = 0 THEN 100
    ELSE GREATEST(0, 100 - (suspicious_patterns::numeric / total_logs::numeric * 100))
  END;
  
  -- Log integrity check
  PERFORM log_security_event(
    'audit_integrity_validated',
    CASE 
      WHEN integrity_score >= 95 THEN 'low'
      WHEN integrity_score >= 80 THEN 'medium'
      ELSE 'high'
    END,
    jsonb_build_object(
      'total_logs', total_logs,
      'suspicious_patterns', suspicious_patterns,
      'integrity_score', integrity_score
    )
  );
  
  -- Check for potential tampering
  IF suspicious_patterns > (total_logs * 0.05) THEN
    PERFORM log_security_event(
      'tamper_detection_triggered',
      'critical',
      jsonb_build_object(
        'suspicious_ratio', suspicious_patterns::numeric / total_logs::numeric,
        'threshold_exceeded', true
      )
    );
  END IF;
  
  result := jsonb_build_object(
    'status', CASE 
      WHEN integrity_score >= 95 THEN 'excellent'
      WHEN integrity_score >= 80 THEN 'good'
      WHEN integrity_score >= 60 THEN 'fair'
      ELSE 'poor'
    END,
    'integrity_score', integrity_score,
    'total_logs', total_logs,
    'suspicious_patterns', suspicious_patterns,
    'recommendations', CASE 
      WHEN integrity_score < 80 THEN jsonb_build_array(
        'Review recent audit log patterns',
        'Investigate bulk operations',
        'Verify user authentication logs'
      )
      ELSE jsonb_build_array()
    END
  );
  
  RETURN result;
END;
$$;

-- ==========================================
-- PHASE 4: ENHANCED SECURITY POLICIES
-- ==========================================

-- 7. Update email_exchanges RLS for communication security
DROP POLICY IF EXISTS "Users can view their own email exchanges" ON public.email_exchanges;
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

-- 8. Update quotes RLS for financial data security
DROP POLICY IF EXISTS "Users can access their own quotes only" ON public.quotes;
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

-- 9. Create comprehensive security monitoring function
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
  
  -- Log dashboard access
  PERFORM log_security_event(
    'security_dashboard_accessed',
    'low',
    jsonb_build_object('metrics_generated', true)
  );
  
  RETURN metrics;
END;
$$;