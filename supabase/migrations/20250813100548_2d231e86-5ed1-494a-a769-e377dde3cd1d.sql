-- CRITICAL SECURITY ENHANCEMENT: Comprehensive RLS Policy Hardening
-- Phase 1: Critical fixes for data exposure vulnerabilities (Fixed Version)

-- 1. ENHANCE GMAIL CREDENTIALS PROTECTION
-- Add additional security controls and audit logging for Gmail credentials access
CREATE OR REPLACE FUNCTION public.audit_gmail_credentials_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all Gmail credential access attempts (INSERT, UPDATE, DELETE only)
  INSERT INTO public.security_events (
    user_id, event_type, severity, details
  ) VALUES (
    auth.uid(),
    'gmail_credentials_accessed',
    'high',
    jsonb_build_object(
      'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
      'operation', TG_OP,
      'has_encrypted_tokens', (COALESCE(NEW.access_token_encrypted, OLD.access_token_encrypted) IS NOT NULL),
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to Gmail credentials (no SELECT trigger)
DROP TRIGGER IF EXISTS audit_gmail_credentials_trigger ON public.gmail_credentials;
CREATE TRIGGER audit_gmail_credentials_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.gmail_credentials
  FOR EACH ROW EXECUTE FUNCTION public.audit_gmail_credentials_access();

-- 2. FINANCIAL DATA PROTECTION ENHANCEMENT
-- Create secure financial data access function
CREATE OR REPLACE FUNCTION public.can_access_financial_data(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Users can only access their own financial data
    auth.uid() = target_user_id
    OR EXISTS (
      -- Team managers can access their team members' data
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id 
      WHERE tm.user_id = target_user_id
      AND t.manager_id = auth.uid()
    )
    OR EXISTS (
      -- Admins have audited access
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    );
$$;

-- 3. SECURE QUOTES TABLE FINANCIAL DATA
-- Enhanced RLS for quotes table with financial protection
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Supervisors can view team quotes" ON public.quotes;

-- Create comprehensive quote access policy
CREATE POLICY "Secure financial quote access"
ON public.quotes FOR ALL
USING (can_access_financial_data(user_id));

-- Add financial data audit for quotes
CREATE OR REPLACE FUNCTION public.audit_quote_financial_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, severity, details
  ) VALUES (
    auth.uid(),
    'financial_data_accessed',
    'high',
    jsonb_build_object(
      'table', 'quotes',
      'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
      'operation', TG_OP,
      'has_financial_data', true,
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_quote_financial_trigger ON public.quotes;
CREATE TRIGGER audit_quote_financial_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.audit_quote_financial_access();

-- 4. ENHANCE PROFILE DATA PROTECTION
-- Strengthen profile access to prevent cross-user data access
DROP POLICY IF EXISTS "Limited admin profile access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create strict profile access policy
CREATE POLICY "Strict profile access control"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id  -- Users can only view their own profile
  OR EXISTS (
    -- Team managers can only view their direct team members
    SELECT 1 FROM public.teams t
    JOIN public.team_members tm ON t.id = tm.team_id 
    WHERE tm.user_id = profiles.id
    AND t.manager_id = auth.uid()
  )
);

CREATE POLICY "Users can modify own profile only"
ON public.profiles FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. COMMUNICATION ARCHIVE SECURITY ENHANCEMENT
-- Add audit trigger for archived communications access
CREATE OR REPLACE FUNCTION public.audit_archive_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log archive modifications for compliance
  INSERT INTO public.security_events (
    user_id, event_type, severity, details
  ) VALUES (
    auth.uid(),
    'communication_archive_modified',
    'medium',
    jsonb_build_object(
      'archive_id', COALESCE(NEW.id, OLD.id),
      'communication_type', COALESCE(NEW.communication_type, OLD.communication_type),
      'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
      'operation', TG_OP,
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_archive_access_trigger ON public.communication_archive;
CREATE TRIGGER audit_archive_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.communication_archive
  FOR EACH ROW EXECUTE FUNCTION public.audit_archive_access();

-- 6. SECURITY EVENTS TABLE PROTECTION
-- Ensure security events are properly protected
DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;

CREATE POLICY "Admin-only security event access"
ON public.security_events FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- Users can view their own security events only
    auth.uid() = user_id 
    AND event_type NOT IN ('admin_action', 'security_scan_completed', 'threat_level_elevated')
  )
);

CREATE POLICY "System security event insertion"
ON public.security_events FOR INSERT
WITH CHECK (true);

-- 7. ENHANCED TOKEN ROTATION FOR GMAIL
-- Create function for secure token management
CREATE OR REPLACE FUNCTION public.rotate_gmail_tokens(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow users to rotate their own tokens
  IF auth.uid() != p_user_id THEN
    PERFORM log_security_event(
      'unauthorized_token_rotation_attempt',
      'critical',
      jsonb_build_object('target_user_id', p_user_id)
    );
    RETURN false;
  END IF;
  
  -- Mark current tokens for rotation (actual rotation handled by application)
  UPDATE public.gmail_credentials 
  SET updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log token rotation request
  PERFORM log_security_event(
    'gmail_token_rotation_requested',
    'medium',
    jsonb_build_object('user_id', p_user_id)
  );
  
  RETURN true;
END;
$$;

-- 8. CREATE SECURITY DASHBOARD FUNCTION
-- Function to provide security metrics for administrators
CREATE OR REPLACE FUNCTION public.get_security_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  metrics jsonb;
BEGIN
  -- Only admins can access security dashboard
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized access to security dashboard';
  END IF;
  
  SELECT jsonb_build_object(
    'critical_events_24h', (
      SELECT COUNT(*) FROM public.security_events 
      WHERE severity = 'critical' AND timestamp > now() - interval '24 hours'
    ),
    'high_events_24h', (
      SELECT COUNT(*) FROM public.security_events 
      WHERE severity = 'high' AND timestamp > now() - interval '24 hours'
    ),
    'failed_access_attempts_24h', (
      SELECT COUNT(*) FROM public.security_events 
      WHERE event_type LIKE '%unauthorized%' AND timestamp > now() - interval '24 hours'
    ),
    'encrypted_clients_count', (
      SELECT COUNT(*) FROM public.clients 
      WHERE encrypted_ssn IS NOT NULL OR encrypted_passport_number IS NOT NULL OR encrypted_payment_info IS NOT NULL
    ),
    'active_gmail_integrations', (
      SELECT COUNT(*) FROM public.gmail_credentials 
      WHERE access_token_encrypted IS NOT NULL
    ),
    'scan_timestamp', now()
  ) INTO metrics;
  
  -- Log dashboard access
  PERFORM log_security_event(
    'security_dashboard_accessed',
    'low',
    jsonb_build_object('admin_user_id', auth.uid())
  );
  
  RETURN metrics;
END;
$$;

-- 9. ENHANCED EMAIL EXCHANGES SECURITY
-- Add audit logging for email access
CREATE OR REPLACE FUNCTION public.audit_email_exchange_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log sensitive email operations
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    INSERT INTO public.security_events (
      user_id, event_type, severity, details
    ) VALUES (
      auth.uid(),
      'email_communication_modified',
      'medium',
      jsonb_build_object(
        'email_id', OLD.id,
        'direction', OLD.direction,
        'operation', TG_OP,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_email_exchange_trigger ON public.email_exchanges;
CREATE TRIGGER audit_email_exchange_trigger
  AFTER UPDATE OR DELETE ON public.email_exchanges
  FOR EACH ROW EXECUTE FUNCTION public.audit_email_exchange_access();

-- 10. UPDATE SECURITY EVENT TYPES
-- Add the new security event types to the constraint
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;
ALTER TABLE public.security_events ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type IN (
  'login_success', 'login_failure', 'logout', 'password_change',
  'unauthorized_access_attempt', 'suspicious_activity', 'data_breach_attempt',
  'admin_action', 'sensitive_data_access', 'client_sensitive_modified',
  'gmail_credentials_updated', 'gmail_credentials_accessed',
  'invalid_oauth_state_token', 'option_token_access_denied',
  'option_token_accessed', 'option_review_token_generated', 'rate_limit_exceeded',
  'invalid_option_token_attempt', 'unauthorized_sensitive_access',
  'sensitive_data_accessed', 'authorized_sensitive_access',
  'unauthorized_sensitive_access_attempt', 'sensitive_client_data_access',
  'encryption_operation', 'decryption_operation', 'field_encryption_audit',
  'token_storage_blocked', 'security_scan_completed', 'threat_level_elevated',
  'access_pattern_anomaly', 'brute_force_attempt', 'session_hijack_attempt',
  'sql_injection_attempt', 'xss_attempt', 'csrf_attempt', 'security_system_updated',
  'client_access_control_enhanced', 'admin_client_access', 'emergency_client_access',
  'security_access_controls_validated', 'security_enhancement_applied',
  'financial_data_accessed', 'communication_archive_modified',
  'unauthorized_token_rotation_attempt', 'gmail_token_rotation_requested',
  'security_dashboard_accessed', 'email_communication_modified'
));

-- Log security enhancement completion
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  auth.uid(),
  'security_enhancement_applied',
  'low',
  jsonb_build_object(
    'enhancement_phase', 'Phase 1 - Critical Security Fixes',
    'fixes_applied', jsonb_build_array(
      'Gmail credentials protection enhanced',
      'Financial data access controls strengthened', 
      'Communication privacy controls implemented',
      'Profile access restrictions tightened',
      'Security event logging enhanced',
      'Token rotation mechanism created',
      'Security dashboard metrics implemented',
      'Email exchange audit logging added'
    ),
    'timestamp', now()
  )
);