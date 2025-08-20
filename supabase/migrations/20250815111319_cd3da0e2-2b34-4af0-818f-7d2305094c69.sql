-- Final Security Hardening Migration
-- Phase 1: Database Function Hardening

-- Update existing functions to include proper search_path
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow users to access their own Gmail credentials
  RETURN auth.uid() = target_user_id;
END;
$$;

-- Enhanced rate limiting with IP tracking
CREATE OR REPLACE FUNCTION public.advanced_rate_limit_check(
  p_identifier text, 
  p_endpoint text, 
  p_ip_address inet DEFAULT NULL,
  p_max_requests integer DEFAULT 10, 
  p_window_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
  ip_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
  result jsonb;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Clean up old entries
  DELETE FROM public.access_rate_limits 
  WHERE window_start < now() - INTERVAL '1 hour';
  
  -- Get current count for this identifier/endpoint
  SELECT COALESCE(SUM(request_count), 0) 
  INTO current_count
  FROM public.access_rate_limits
  WHERE identifier = p_identifier 
  AND endpoint = p_endpoint
  AND window_start > window_start;
  
  -- Check IP-based rate limiting if IP provided
  IF p_ip_address IS NOT NULL THEN
    SELECT COALESCE(SUM(request_count), 0)
    INTO ip_count
    FROM public.access_rate_limits
    WHERE identifier = p_ip_address::text
    AND window_start > window_start;
    
    -- Block if IP exceeds limits (stricter for IPs)
    IF ip_count >= (p_max_requests * 2) THEN
      PERFORM public.log_security_event(
        'ip_rate_limit_exceeded',
        'critical',
        jsonb_build_object(
          'ip_address', p_ip_address,
          'requests_count', ip_count,
          'max_allowed', p_max_requests * 2
        )
      );
      
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'ip_rate_limit_exceeded',
        'retry_after', p_window_minutes * 60
      );
    END IF;
  END IF;
  
  -- Check identifier limits
  IF current_count >= p_max_requests THEN
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      'high',
      jsonb_build_object(
        'identifier', p_identifier,
        'endpoint', p_endpoint,
        'current_count', current_count,
        'max_requests', p_max_requests
      )
    );
    
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'retry_after', p_window_minutes * 60
    );
  END IF;
  
  -- Record this request
  INSERT INTO public.access_rate_limits (identifier, endpoint, request_count)
  VALUES (p_identifier, p_endpoint, 1)
  ON CONFLICT (identifier, endpoint) 
  DO UPDATE SET 
    request_count = access_rate_limits.request_count + 1,
    window_start = CASE 
      WHEN access_rate_limits.window_start < window_start 
      THEN now() 
      ELSE access_rate_limits.window_start 
    END;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'requests_remaining', p_max_requests - current_count - 1
  );
END;
$$;

-- Session hijacking detection
CREATE OR REPLACE FUNCTION public.detect_session_anomaly(
  p_user_id uuid,
  p_current_fingerprint text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stored_fingerprint text;
  last_ip inet;
  last_user_agent text;
  last_activity timestamp with time zone;
  anomaly_score integer := 0;
  result jsonb;
BEGIN
  -- Get stored session data
  SELECT 
    metadata->>'deviceFingerprint',
    (metadata->>'ipAddress')::inet,
    metadata->>'userAgent',
    last_activity
  INTO stored_fingerprint, last_ip, last_user_agent, last_activity
  FROM public.user_sessions 
  WHERE user_id = p_user_id 
  AND is_active = true
  ORDER BY last_activity DESC 
  LIMIT 1;
  
  -- Calculate anomaly score
  IF stored_fingerprint IS NOT NULL AND stored_fingerprint != p_current_fingerprint THEN
    anomaly_score := anomaly_score + 50;
  END IF;
  
  IF last_ip IS NOT NULL AND p_ip_address IS NOT NULL AND last_ip != p_ip_address THEN
    anomaly_score := anomaly_score + 30;
  END IF;
  
  IF last_user_agent IS NOT NULL AND p_user_agent IS NOT NULL AND last_user_agent != p_user_agent THEN
    anomaly_score := anomaly_score + 20;
  END IF;
  
  -- Check for suspicious timing patterns
  IF last_activity IS NOT NULL AND (now() - last_activity) < INTERVAL '1 minute' THEN
    anomaly_score := anomaly_score + 25;
  END IF;
  
  -- Log if anomaly detected
  IF anomaly_score >= 50 THEN
    PERFORM public.log_security_event(
      'session_anomaly_detected',
      CASE 
        WHEN anomaly_score >= 75 THEN 'critical'
        WHEN anomaly_score >= 50 THEN 'high'
        ELSE 'medium'
      END,
      jsonb_build_object(
        'user_id', p_user_id,
        'anomaly_score', anomaly_score,
        'fingerprint_mismatch', (stored_fingerprint != p_current_fingerprint),
        'ip_change', (last_ip != p_ip_address),
        'user_agent_change', (last_user_agent != p_user_agent)
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'anomaly_score', anomaly_score,
    'requires_verification', anomaly_score >= 50,
    'force_logout', anomaly_score >= 75
  );
END;
$$;

-- Automated compliance reporting
CREATE OR REPLACE FUNCTION public.generate_compliance_report(
  p_report_type text DEFAULT 'gdpr',
  p_start_date date DEFAULT (now() - INTERVAL '30 days')::date,
  p_end_date date DEFAULT now()::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  data_access_count integer;
  security_events_count integer;
  user_count integer;
  consent_compliance numeric;
BEGIN
  -- Only admins can generate compliance reports
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required for compliance reporting';
  END IF;
  
  -- Count data access events
  SELECT COUNT(*) INTO data_access_count
  FROM public.data_access_audit
  WHERE timestamp::date BETWEEN p_start_date AND p_end_date;
  
  -- Count security events
  SELECT COUNT(*) INTO security_events_count
  FROM public.security_events
  WHERE timestamp::date BETWEEN p_start_date AND p_end_date;
  
  -- Count active users
  SELECT COUNT(DISTINCT user_id) INTO user_count
  FROM public.security_events
  WHERE timestamp::date BETWEEN p_start_date AND p_end_date;
  
  -- Calculate consent compliance rate
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 100
      ELSE (COUNT(*) FILTER (WHERE consent_given = true)::numeric / COUNT(*) * 100)
    END
  INTO consent_compliance
  FROM public.gdpr_consent
  WHERE timestamp::date BETWEEN p_start_date AND p_end_date;
  
  result := jsonb_build_object(
    'report_type', p_report_type,
    'period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'metrics', jsonb_build_object(
      'total_data_access_events', data_access_count,
      'total_security_events', security_events_count,
      'active_users', user_count,
      'consent_compliance_rate', consent_compliance
    ),
    'generated_at', now(),
    'generated_by', auth.uid()
  );
  
  -- Log compliance report generation
  PERFORM public.log_security_event(
    'compliance_report_generated',
    'medium',
    jsonb_build_object(
      'report_type', p_report_type,
      'period_days', p_end_date - p_start_date,
      'metrics_summary', result->'metrics'
    )
  );
  
  RETURN result;
END;
$$;

-- Automated data retention cleanup
CREATE OR REPLACE FUNCTION public.automated_data_retention_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  policies_applied integer := 0;
  records_deleted integer := 0;
  policy_record record;
  temp_count integer;
BEGIN
  -- Apply data retention policies
  FOR policy_record IN 
    SELECT table_name, retention_period, auto_delete 
    FROM public.data_retention_policies 
    WHERE auto_delete = true
  LOOP
    CASE policy_record.table_name
      WHEN 'security_events' THEN
        DELETE FROM public.security_events 
        WHERE timestamp < (now() - policy_record.retention_period)
        AND severity IN ('low', 'medium');
        
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        records_deleted := records_deleted + temp_count;
        
      WHEN 'audit_logs' THEN
        DELETE FROM public.audit_logs 
        WHERE timestamp < (now() - policy_record.retention_period);
        
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        records_deleted := records_deleted + temp_count;
        
      WHEN 'email_exchanges' THEN
        -- Archive old emails before deletion
        PERFORM public.archive_old_emails();
        
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        records_deleted := records_deleted + temp_count;
    END CASE;
    
    policies_applied := policies_applied + 1;
  END LOOP;
  
  -- Log cleanup activity
  PERFORM public.log_security_event(
    'automated_data_cleanup',
    'low',
    jsonb_build_object(
      'policies_applied', policies_applied,
      'records_deleted', records_deleted,
      'cleanup_timestamp', now()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'policies_applied', policies_applied,
    'records_deleted', records_deleted,
    'timestamp', now()
  );
END;
$$;

-- Advanced security metrics calculation
CREATE OR REPLACE FUNCTION public.calculate_security_metrics(
  p_time_window_hours integer DEFAULT 24
)
RETURNS jsonb
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
  failed_logins integer;
  anomaly_count integer;
BEGIN
  -- Count events by severity
  SELECT 
    COUNT(*) FILTER (WHERE severity = 'critical'),
    COUNT(*) FILTER (WHERE severity = 'high')
  INTO critical_events, high_events
  FROM public.security_events
  WHERE timestamp > (now() - (p_time_window_hours || ' hours')::interval);
  
  -- Count failed login attempts
  SELECT COUNT(*) INTO failed_logins
  FROM public.security_events
  WHERE event_type LIKE '%login%failed%'
  AND timestamp > (now() - (p_time_window_hours || ' hours')::interval);
  
  -- Count anomalies
  SELECT COUNT(*) INTO anomaly_count
  FROM public.security_events
  WHERE event_type LIKE '%anomaly%'
  AND timestamp > (now() - (p_time_window_hours || ' hours')::interval);
  
  -- Calculate risk score
  risk_score := (critical_events * 10) + (high_events * 5) + (failed_logins * 2) + anomaly_count;
  
  -- Determine threat level
  threat_level := CASE
    WHEN risk_score >= 50 THEN 'critical'
    WHEN risk_score >= 25 THEN 'high'
    WHEN risk_score >= 10 THEN 'medium'
    ELSE 'low'
  END;
  
  result := jsonb_build_object(
    'threat_level', threat_level,
    'risk_score', risk_score,
    'time_window_hours', p_time_window_hours,
    'event_counts', jsonb_build_object(
      'critical_events', critical_events,
      'high_events', high_events,
      'failed_logins', failed_logins,
      'anomaly_count', anomaly_count
    ),
    'calculated_at', now()
  );
  
  RETURN result;
END;
$$;

-- Create tables for enhanced security features
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  device_fingerprint text,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_activity timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  auto_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compliance_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  report_data jsonb NOT NULL,
  generated_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_sessions
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "System can manage all sessions" ON public.user_sessions
FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for security_alerts
CREATE POLICY "Admins can view security alerts" ON public.security_alerts
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create security alerts" ON public.security_alerts
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can acknowledge alerts" ON public.security_alerts
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for compliance_reports
CREATE POLICY "Admins can view compliance reports" ON public.compliance_reports
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create compliance reports" ON public.compliance_reports
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active, last_activity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON public.security_alerts(severity, created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type_period ON public.compliance_reports(report_type, period_start, period_end);

-- Create automated security alert triggers
CREATE OR REPLACE FUNCTION public.create_security_alert_for_critical_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create alerts for critical and high severity events
  IF NEW.severity IN ('critical', 'high') THEN
    INSERT INTO public.security_alerts (
      alert_type, 
      severity, 
      title, 
      description, 
      metadata
    ) VALUES (
      NEW.event_type,
      NEW.severity,
      'Security Event: ' || NEW.event_type,
      'Critical security event detected requiring immediate attention',
      jsonb_build_object(
        'event_id', NEW.id,
        'user_id', NEW.user_id,
        'timestamp', NEW.timestamp,
        'details', NEW.details
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER security_alert_trigger
  AFTER INSERT ON public.security_events
  FOR EACH ROW
  EXECUTE FUNCTION public.create_security_alert_for_critical_events();