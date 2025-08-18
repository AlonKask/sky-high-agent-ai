-- COMPREHENSIVE SECURITY HARDENING MIGRATION
-- Phase 1: Critical Data Protection & RLS Policy Fixes

-- Fix Customer Personal Information Exposure
DROP POLICY IF EXISTS "Emergency admin client access" ON public.clients;
CREATE POLICY "Secure admin client emergency access" ON public.clients
  FOR SELECT USING (
    (auth.uid() = user_id) OR 
    (
      has_admin_role() AND 
      log_security_event(
        'admin_emergency_client_access',
        'critical',
        jsonb_build_object(
          'admin_id', auth.uid(),
          'client_id', id,
          'client_owner', user_id,
          'requires_business_justification', true,
          'timestamp', now(),
          'emergency_access', true
        )
      ) IS NOT NULL AND
      check_advanced_rate_limit(auth.uid()::text, 'admin_client_emergency', 2, 60) = true
    )
  );

-- Fix Financial Records Vulnerability - Enhance Quotes Security
DROP POLICY IF EXISTS "Managers can view team quotes" ON public.quotes;
CREATE POLICY "Secure manager team quotes access" ON public.quotes
  FOR SELECT USING (
    (auth.uid() = user_id) OR
    (
      has_admin_role() AND
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN teams t ON t.manager_id = auth.uid()
        JOIN team_members tm ON tm.team_id = t.id
        WHERE tm.user_id = quotes.user_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('manager', 'supervisor', 'admin')
      ) AND
      log_security_event(
        'manager_financial_access',
        'high',
        jsonb_build_object(
          'manager_id', auth.uid(),
          'quote_owner', user_id,
          'quote_id', id,
          'quote_value', total_price,
          'access_type', 'team_oversight',
          'requires_justification', true
        )
      ) IS NOT NULL AND
      check_advanced_rate_limit(auth.uid()::text, 'manager_financial_access', 5, 60) = true
    )
  );

-- Fix Private Communications Interception - Email Exchange Security
ALTER TABLE public.email_exchanges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own emails" ON public.email_exchanges;
CREATE POLICY "Ultra secure email access" ON public.email_exchanges
  FOR ALL USING (
    auth.uid() = user_id AND
    validate_session_security() AND
    check_advanced_rate_limit(auth.uid()::text, 'email_access', 50, 10) = true AND
    log_security_event(
      'email_exchange_access',
      'medium',
      jsonb_build_object(
        'user_id', auth.uid(),
        'email_id', id,
        'sender_email', sender_email,
        'access_type', 'email_management'
      )
    ) IS NOT NULL
  )
  WITH CHECK (
    auth.uid() = user_id AND
    validate_session_security()
  );

-- Fix Authentication Token Hijacking - Gmail Credentials Ultra Security
-- Already has ultra secure policy, but let's enhance it further
DROP POLICY IF EXISTS "Ultra secure gmail credentials access" ON public.gmail_credentials;
CREATE POLICY "Maximum security gmail credentials" ON public.gmail_credentials
  FOR ALL USING (
    auth.uid() = user_id AND
    validate_session_security() AND
    check_advanced_rate_limit(auth.uid()::text, 'gmail_credentials_access', 2, 30) = true AND
    log_security_event(
      'gmail_credentials_access',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'gmail_email', gmail_user_email,
        'ip_address', inet_client_addr(),
        'session_validated', true,
        'action', 'credentials_accessed'
      )
    ) IS NOT NULL
  )
  WITH CHECK (
    auth.uid() = user_id AND
    validate_session_security() AND
    check_advanced_rate_limit(auth.uid()::text, 'gmail_credentials_modify', 1, 120) = true
  );

-- Fix Business Intelligence Data Leak - Client Intelligence & Sales Memories
DROP POLICY IF EXISTS "Secure client intelligence access" ON public.client_intelligence;
CREATE POLICY "Maximum security client intelligence" ON public.client_intelligence
  FOR ALL USING (
    auth.uid() = user_id AND
    validate_session_security() AND
    check_advanced_rate_limit(auth.uid()::text, 'client_intelligence_access', 8, 15) = true AND
    log_security_event(
      'business_intelligence_access',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'client_id', client_id,
        'data_type', 'client_intelligence',
        'risk_score', risk_score,
        'profit_potential', profit_potential
      )
    ) IS NOT NULL
  )
  WITH CHECK (
    auth.uid() = user_id AND
    validate_session_security()
  );

DROP POLICY IF EXISTS "Secure sales memories access" ON public.sales_memories;
CREATE POLICY "Maximum security sales memories" ON public.sales_memories
  FOR ALL USING (
    auth.uid() = user_id AND
    validate_session_security() AND
    check_advanced_rate_limit(auth.uid()::text, 'sales_memories_access', 10, 10) = true AND
    log_security_event(
      'sales_intelligence_access',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'client_id', client_id,
        'opportunity_value', success_probability,
        'stage', stage,
        'data_type', 'sales_memory'
      )
    ) IS NOT NULL
  )
  WITH CHECK (
    auth.uid() = user_id AND
    validate_session_security()
  );

-- Phase 2: Enhanced Audit and Monitoring

-- Create immutable audit log for critical operations
CREATE TABLE IF NOT EXISTS public.critical_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  operation_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  risk_assessment text NOT NULL DEFAULT 'medium',
  business_justification text,
  ip_address inet,
  user_agent text,
  session_id text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  integrity_hash text NOT NULL
);

-- Make audit trail immutable
ALTER TABLE public.critical_audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Immutable audit trail" ON public.critical_audit_trail
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "System audit trail creation" ON public.critical_audit_trail
  FOR INSERT WITH CHECK (true);

-- Enhanced security monitoring table
CREATE TABLE IF NOT EXISTS public.security_threat_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  threat_type text NOT NULL,
  severity_score integer NOT NULL DEFAULT 0,
  threat_indicators jsonb NOT NULL DEFAULT '{}',
  automated_response text,
  investigation_status text NOT NULL DEFAULT 'pending',
  resolution_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone
);

ALTER TABLE public.security_threat_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin security threat analysis" ON public.security_threat_analysis
  FOR ALL USING (has_admin_role()) WITH CHECK (has_admin_role());

-- Phase 3: Business Hours and Session Validation Enhancement
CREATE OR REPLACE FUNCTION public.validate_business_hours_access()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow 24/7 access for critical business needs
  -- But log after-hours access for security monitoring
  IF EXTRACT(hour FROM now() AT TIME ZONE 'UTC') NOT BETWEEN 6 AND 22 THEN
    PERFORM public.log_security_event(
      'after_hours_access',
      'medium',
      jsonb_build_object(
        'user_id', auth.uid(),
        'access_time', now(),
        'timezone', 'UTC'
      )
    );
  END IF;
  
  RETURN true;
END;
$$;

-- Phase 4: Advanced Rate Limiting and Threat Detection
CREATE OR REPLACE FUNCTION public.detect_security_threats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  threat_score integer := 0;
  threat_indicators jsonb := '{}';
  recent_events integer;
  suspicious_patterns integer;
BEGIN
  -- Analyze recent security events
  SELECT COUNT(*) INTO recent_events
  FROM public.security_events
  WHERE user_id = p_user_id
  AND timestamp > now() - interval '1 hour'
  AND severity IN ('high', 'critical');
  
  -- Check for suspicious access patterns
  SELECT COUNT(DISTINCT details->>'accessed_table') INTO suspicious_patterns
  FROM public.security_events
  WHERE user_id = p_user_id
  AND timestamp > now() - interval '15 minutes'
  AND event_type LIKE '%_access%';
  
  -- Calculate threat score
  threat_score := recent_events * 10 + suspicious_patterns * 5;
  
  -- Build threat indicators
  threat_indicators := jsonb_build_object(
    'recent_high_severity_events', recent_events,
    'suspicious_access_patterns', suspicious_patterns,
    'calculated_threat_score', threat_score,
    'analysis_timestamp', now()
  );
  
  -- Log threat analysis if score is concerning
  IF threat_score > 20 THEN
    INSERT INTO public.security_threat_analysis (
      user_id,
      threat_type,
      severity_score,
      threat_indicators,
      automated_response
    ) VALUES (
      p_user_id,
      'suspicious_activity_pattern',
      threat_score,
      threat_indicators,
      CASE 
        WHEN threat_score > 50 THEN 'account_suspension_recommended'
        WHEN threat_score > 30 THEN 'enhanced_monitoring_enabled'
        ELSE 'continued_observation'
      END
    );
  END IF;
  
  RETURN threat_indicators;
END;
$$;

-- Phase 5: Data Classification and Access Control
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS access_restricted boolean DEFAULT false;
ALTER TABLE public.email_exchanges ADD COLUMN IF NOT EXISTS data_classification text DEFAULT 'confidential';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS financial_sensitivity text DEFAULT 'high';

-- Create function to validate data access based on classification
CREATE OR REPLACE FUNCTION public.validate_data_classification_access(
  p_data_classification text,
  p_required_role app_role DEFAULT 'user'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Validate access based on data classification
  CASE p_data_classification
    WHEN 'secret' THEN
      RETURN user_role IN ('admin');
    WHEN 'confidential' THEN
      RETURN user_role IN ('admin', 'manager', 'supervisor');
    WHEN 'restricted' THEN
      RETURN user_role IN ('admin', 'manager', 'supervisor', 'gds_expert');
    ELSE
      RETURN user_role >= p_required_role;
  END CASE;
END;
$$;

-- Add trigger to automatically log critical data access
CREATE OR REPLACE FUNCTION public.log_critical_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  integrity_hash text;
BEGIN
  -- Generate integrity hash
  integrity_hash := encode(
    digest(
      COALESCE(NEW.id::text, OLD.id::text) || 
      TG_OP || 
      now()::text || 
      auth.uid()::text,
      'sha256'
    ),
    'hex'
  );
  
  -- Log to critical audit trail
  INSERT INTO public.critical_audit_trail (
    user_id,
    operation_type,
    table_name,
    record_id,
    old_values,
    new_values,
    risk_assessment,
    ip_address,
    session_id,
    integrity_hash
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    CASE 
      WHEN TG_TABLE_NAME IN ('clients', 'gmail_credentials', 'quotes') THEN 'critical'
      WHEN TG_TABLE_NAME IN ('email_exchanges', 'client_intelligence') THEN 'high'
      ELSE 'medium'
    END,
    inet_client_addr(),
    current_setting('application_name', true),
    integrity_hash
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply critical audit triggers to sensitive tables
DROP TRIGGER IF EXISTS critical_audit_clients ON public.clients;
CREATE TRIGGER critical_audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_critical_data_access();

DROP TRIGGER IF EXISTS critical_audit_gmail_credentials ON public.gmail_credentials;
CREATE TRIGGER critical_audit_gmail_credentials
  AFTER INSERT OR UPDATE OR DELETE ON public.gmail_credentials
  FOR EACH ROW EXECUTE FUNCTION public.log_critical_data_access();

DROP TRIGGER IF EXISTS critical_audit_quotes ON public.quotes;
CREATE TRIGGER critical_audit_quotes
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.log_critical_data_access();

DROP TRIGGER IF EXISTS critical_audit_email_exchanges ON public.email_exchanges;
CREATE TRIGGER critical_audit_email_exchanges
  AFTER INSERT OR UPDATE OR DELETE ON public.email_exchanges
  FOR EACH ROW EXECUTE FUNCTION public.log_critical_data_access();

-- Cleanup old security events to prevent log flooding
CREATE OR REPLACE FUNCTION public.automated_security_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Archive old low/medium severity events older than 30 days
  DELETE FROM public.security_events 
  WHERE timestamp < now() - interval '30 days'
  AND severity IN ('low', 'medium');
  
  -- Archive old high severity events older than 90 days  
  DELETE FROM public.security_events
  WHERE timestamp < now() - interval '90 days'
  AND severity = 'high';
  
  -- Keep critical events for 1 year
  DELETE FROM public.security_events
  WHERE timestamp < now() - interval '1 year'
  AND severity = 'critical';
  
  -- Clean up old rate limit entries
  DELETE FROM public.access_rate_limits
  WHERE window_start < now() - interval '24 hours';
END;
$$;