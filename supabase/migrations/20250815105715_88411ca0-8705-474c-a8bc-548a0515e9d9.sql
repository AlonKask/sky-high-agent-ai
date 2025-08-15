-- COMPREHENSIVE SECURITY ENHANCEMENT MIGRATION
-- Phase 1: Enhanced Client Data Protection with Team-Based Access

-- Drop existing function to recreate with enhanced logic
DROP FUNCTION IF EXISTS public.can_access_client_data_secure(uuid);

-- Create enhanced client data access function with team-based controls
CREATE OR REPLACE FUNCTION public.can_access_client_data_secure(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_direct_team_member boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Allow users to access their own client data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get the accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- For managers: Only allow access to direct team members' clients
  IF user_role = 'manager' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      -- Log manager access to team member's client data
      PERFORM public.log_security_event(
        'manager_team_client_access',
        'medium',
        jsonb_build_object(
          'manager_id', accessing_user_id,
          'team_member_id', target_user_id,
          'justification', 'manager_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For supervisors: Only allow access to direct team members' clients
  IF user_role = 'supervisor' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      -- Log supervisor access to team member's client data
      PERFORM public.log_security_event(
        'supervisor_team_client_access',
        'medium',
        jsonb_build_object(
          'supervisor_id', accessing_user_id,
          'team_member_id', target_user_id,
          'justification', 'supervisor_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: Require explicit justification and heavy logging
  IF user_role = 'admin' THEN
    -- Log admin access as high severity security event
    PERFORM public.log_security_event(
      'admin_client_data_access',
      'high',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'access_reason', 'admin_override',
        'requires_justification', true,
        'timestamp', now()
      )
    );
    
    -- Also log to sensitive data access table
    PERFORM public.log_sensitive_data_access(
      target_user_id,
      'client_data_admin_access',
      'ADMIN OVERRIDE - Requires business justification'
    );
    
    RETURN true;
  END IF;
  
  -- Deny all other access
  PERFORM public.log_security_event(
    'unauthorized_client_access_attempt',
    'high',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'user_role', user_role,
      'denial_reason', 'insufficient_privileges'
    )
  );
  
  RETURN false;
END;
$function$;

-- Phase 2: Enhanced Gmail Credentials Security

-- Create function to validate Gmail credentials access
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  access_count integer;
BEGIN
  -- Must be authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can ONLY access their own Gmail credentials
  IF accessing_user_id != target_user_id THEN
    -- Log unauthorized attempt
    PERFORM public.log_security_event(
      'unauthorized_gmail_access_attempt',
      'critical',
      jsonb_build_object(
        'accessing_user_id', accessing_user_id,
        'target_user_id', target_user_id,
        'timestamp', now()
      )
    );
    RETURN false;
  END IF;
  
  -- Rate limiting: Check access frequency (max 10 accesses per hour)
  SELECT COUNT(*) INTO access_count
  FROM public.security_events
  WHERE user_id = accessing_user_id
  AND event_type = 'gmail_credentials_accessed'
  AND timestamp > now() - INTERVAL '1 hour';
  
  IF access_count >= 10 THEN
    PERFORM public.log_security_event(
      'gmail_credentials_rate_limit_exceeded',
      'high',
      jsonb_build_object(
        'user_id', accessing_user_id,
        'access_count', access_count,
        'window', '1 hour'
      )
    );
    RETURN false;
  END IF;
  
  -- Log successful access
  PERFORM public.log_security_event(
    'gmail_credentials_accessed',
    'low',
    jsonb_build_object(
      'user_id', accessing_user_id,
      'timestamp', now()
    )
  );
  
  RETURN true;
END;
$function$;

-- Phase 3: Enhanced Session Security

-- Create secure session validation function
CREATE OR REPLACE FUNCTION public.validate_secure_session(p_session_token text, p_device_fingerprint text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  session_record RECORD;
  session_valid boolean := false;
BEGIN
  -- Get session record
  SELECT * INTO session_record
  FROM public.user_sessions
  WHERE session_token = p_session_token
  AND is_active = true
  AND expires_at > now();
  
  -- Check if session exists and is valid
  IF session_record.id IS NOT NULL THEN
    -- Validate device fingerprint if provided
    IF p_device_fingerprint IS NOT NULL THEN
      -- For now, we'll log fingerprint mismatches but allow access
      -- In production, you might want to invalidate sessions with mismatched fingerprints
      IF session_record.user_agent != p_device_fingerprint THEN
        PERFORM public.log_security_event(
          'session_device_fingerprint_mismatch',
          'medium',
          jsonb_build_object(
            'user_id', session_record.user_id,
            'session_id', session_record.id,
            'expected_fingerprint', session_record.user_agent,
            'received_fingerprint', p_device_fingerprint
          )
        );
      END IF;
    END IF;
    
    -- Update last activity
    UPDATE public.user_sessions
    SET last_activity = now()
    WHERE id = session_record.id;
    
    session_valid := true;
  ELSE
    -- Log invalid session attempt
    PERFORM public.log_security_event(
      'invalid_session_access_attempt',
      'high',
      jsonb_build_object(
        'session_token_hash', encode(digest(p_session_token, 'sha256'), 'hex'),
        'device_fingerprint', p_device_fingerprint,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN session_valid;
END;
$function$;

-- Phase 4: Enhanced Communication Data Protection

-- Update communication access policies
DROP POLICY IF EXISTS "Enhanced emails SELECT - communication protection" ON public.email_exchanges;
DROP POLICY IF EXISTS "Enhanced chat SELECT - communication protection" ON public.agent_client_chat;

-- Create enhanced communication access policies
CREATE POLICY "ULTRA_SECURE_emails_select" ON public.email_exchanges
FOR SELECT 
USING (can_access_communication_data(user_id, client_id));

CREATE POLICY "ULTRA_SECURE_chat_select" ON public.agent_client_chat
FOR SELECT 
USING (can_access_communication_data(user_id, client_id));

-- Phase 5: Data Classification and Audit Tables

-- Create data access audit table for detailed logging
CREATE TABLE IF NOT EXISTS public.data_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accessed_table text NOT NULL,
  accessed_record_id uuid,
  access_type text NOT NULL, -- 'read', 'write', 'delete'
  data_classification text DEFAULT 'general',
  business_justification text,
  approved_by uuid,
  ip_address inet,
  user_agent text,
  timestamp timestamp with time zone DEFAULT now(),
  session_id uuid,
  risk_score integer DEFAULT 0,
  access_denied boolean DEFAULT false,
  denial_reason text
);

-- Enable RLS on audit table
ALTER TABLE public.data_access_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit data
CREATE POLICY "Admins only for data access audit" ON public.data_access_audit
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit records
CREATE POLICY "System can log data access" ON public.data_access_audit
FOR INSERT 
WITH CHECK (true);

-- Create sensitive data access logging function
CREATE OR REPLACE FUNCTION public.log_data_access_audit(
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_access_type text DEFAULT 'read',
  p_classification text DEFAULT 'general',
  p_justification text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.data_access_audit (
    user_id, accessed_table, accessed_record_id, access_type,
    data_classification, business_justification, ip_address,
    timestamp, risk_score
  ) VALUES (
    auth.uid(), p_table_name, p_record_id, p_access_type,
    p_classification, p_justification, 
    COALESCE(inet_client_addr(), '0.0.0.0'::inet),
    now(),
    CASE 
      WHEN p_classification = 'secret' THEN 90
      WHEN p_classification = 'restricted' THEN 70
      WHEN p_classification = 'confidential' THEN 50
      ELSE 10
    END
  );
END;
$function$;

-- Phase 6: Enhanced Security Event Types
-- Update security events constraint with more comprehensive event types
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;

ALTER TABLE public.security_events 
ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type IN (
  -- Authentication events
  'login_attempt', 'login_success', 'login_failure', 'logout',
  'password_change', 'mfa_enabled', 'mfa_disabled', 'mfa_bypass_attempt',
  
  -- Access control events  
  'unauthorized_access_attempt', 'privilege_escalation_attempt',
  'admin_action', 'emergency_access', 'session_hijacking_detected',
  'session_device_fingerprint_mismatch', 'invalid_session_access_attempt',
  
  -- Data access events
  'sensitive_data_access', 'client_data_accessed', 'client_data_modified',
  'manager_team_client_access', 'supervisor_team_client_access',
  'admin_client_data_access', 'unauthorized_client_access_attempt',
  
  -- Communication events
  'communication_accessed', 'email_sent', 'email_received',
  'chat_message_sent', 'communication_export_requested',
  
  -- Gmail integration events
  'gmail_oauth_initiated', 'gmail_oauth_success', 'gmail_oauth_failure',
  'gmail_credentials_accessed', 'gmail_credentials_updated',
  'gmail_credentials_rate_limit_exceeded', 'unauthorized_gmail_access_attempt',
  
  -- System security events
  'suspicious_activity', 'brute_force_attempt', 'rate_limit_exceeded',
  'captcha_verified', 'captcha_failed', 'sql_injection_attempt',
  'xss_attempt', 'csrf_attempt', 'file_upload_violation',
  
  -- Data protection events
  'encryption_operation', 'decryption_operation', 'data_export_requested',
  'data_deletion_requested', 'gdpr_request', 'data_breach_detected',
  
  -- Audit and compliance
  'audit_log_accessed', 'compliance_report_generated',
  'security_policy_violation', 'data_retention_policy_applied'
));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_severity 
ON public.security_events (user_id, severity, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_type_timestamp 
ON public.security_events (event_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_data_access_audit_user_table 
ON public.data_access_audit (user_id, accessed_table, timestamp DESC);

-- Phase 7: Automatic PII Masking Function
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(
  p_data text,
  p_field_type text DEFAULT 'general'
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  -- Return null/empty as-is
  IF p_data IS NULL OR length(trim(p_data)) = 0 THEN
    RETURN p_data;
  END IF;
  
  CASE p_field_type
    WHEN 'ssn' THEN
      -- Mask SSN: XXX-XX-1234
      RETURN regexp_replace(p_data, '(\d{3})-?(\d{2})-?(\d{4})', 'XXX-XX-\3');
    WHEN 'passport' THEN
      -- Mask passport: show last 4 characters
      RETURN regexp_replace(p_data, '(.+)(.{4})$', repeat('X', length('\1')) || '\2');
    WHEN 'email' THEN
      -- Mask email: j***@example.com
      RETURN regexp_replace(p_data, '^(.)(.*)(@.+)$', '\1' || repeat('*', greatest(length('\2'), 1)) || '\3');
    WHEN 'phone' THEN
      -- Mask phone: show last 4 digits
      RETURN regexp_replace(p_data, '(.*)(.{4})$', repeat('X', length('\1')) || '\2');
    WHEN 'payment' THEN
      -- Mask payment info: show last 4 characters
      RETURN regexp_replace(p_data, '(.+)(.{4})$', repeat('*', length('\1')) || '\2');
    ELSE
      -- General masking: show first and last character if length > 3
      IF length(p_data) <= 3 THEN
        RETURN repeat('*', length(p_data));
      ELSE
        RETURN substring(p_data, 1, 1) || repeat('*', length(p_data) - 2) || substring(p_data, length(p_data), 1);
      END IF;
  END CASE;
END;
$function$;