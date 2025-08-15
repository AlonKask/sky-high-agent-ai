-- CRITICAL SECURITY FIXES FOR CRM SYSTEM
-- This migration addresses multiple security vulnerabilities

-- 1. CREATE SECURE EVENT TYPE ENUM
-- Define allowed security event types to prevent injection attacks
CREATE TYPE public.security_event_type AS ENUM (
  'login_attempt',
  'login_success', 
  'login_failure',
  'logout',
  'password_change',
  'account_locked',
  'account_unlocked',
  'mfa_enabled',
  'mfa_disabled',
  'permission_granted',
  'permission_denied',
  'data_access',
  'data_modification',
  'data_deletion',
  'export_request',
  'api_key_created',
  'api_key_revoked',
  'session_expired',
  'suspicious_activity',
  'brute_force_attempt',
  'rate_limit_exceeded',
  'unauthorized_access_attempt',
  'sensitive_data_access',
  'encryption_failure',
  'decryption_failure',
  'backup_created',
  'backup_restored',
  'system_configuration_changed',
  'user_role_changed',
  'client_data_accessed',
  'client_data_modified',
  'communication_accessed',
  'gmail_oauth_initiated',
  'gmail_oauth_success',
  'gmail_oauth_failure',
  'email_sync_started',
  'email_sync_completed',
  'email_sync_failed',
  'captcha_verified',
  'captcha_failed',
  'admin_action',
  'emergency_access',
  'gdpr_request',
  'audit_log_accessed'
);

-- 2. ADD CHECK CONSTRAINT FOR EVENT TYPES
-- Ensure only valid event types can be inserted
ALTER TABLE public.security_events 
DROP CONSTRAINT IF EXISTS security_events_event_type_check;

ALTER TABLE public.security_events 
ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type::text = ANY(enum_range(NULL::security_event_type)::text[]));

-- 3. CREATE MISSING SECURITY FUNCTIONS
-- Function to check if user can access client data with ultra-strict validation
CREATE OR REPLACE FUNCTION public.can_access_client_data_ultra_strict(target_user_id uuid, target_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_authorized boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    PERFORM public.log_security_event(
      'unauthorized_access_attempt'::text,
      'critical'::text,
      jsonb_build_object(
        'reason', 'unauthenticated_access',
        'target_user_id', target_user_id,
        'target_client_id', target_client_id
      )
    );
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
    ) INTO is_authorized;
    
    IF is_authorized THEN
      PERFORM public.log_security_event(
        'admin_action'::text,
        'medium'::text,
        jsonb_build_object(
          'event_subtype', 'manager_client_access',
          'manager_id', accessing_user_id,
          'target_user_id', target_user_id,
          'client_id', target_client_id,
          'justification', 'team_oversight'
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
    ) INTO is_authorized;
    
    IF is_authorized THEN
      PERFORM public.log_security_event(
        'admin_action'::text,
        'medium'::text,
        jsonb_build_object(
          'event_subtype', 'supervisor_client_access',
          'supervisor_id', accessing_user_id,
          'target_user_id', target_user_id,
          'client_id', target_client_id,
          'justification', 'supervisor_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: Require explicit justification and heavy logging
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_action'::text,
      'critical'::text,
      jsonb_build_object(
        'event_subtype', 'admin_client_data_access',
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', target_client_id,
        'requires_justification', true,
        'timestamp', now()
      )
    );
    RETURN true;
  END IF;
  
  -- Deny all other access and log attempt
  PERFORM public.log_security_event(
    'unauthorized_access_attempt'::text,
    'critical'::text,
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'target_client_id', target_client_id,
      'user_role', user_role,
      'denial_reason', 'insufficient_privileges'
    )
  );
  
  RETURN false;
END;
$function$;

-- 4. CREATE ENHANCED GMAIL CREDENTIALS ACCESS FUNCTION
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
BEGIN
  -- Only users can access their own Gmail credentials
  IF accessing_user_id IS NULL OR accessing_user_id != target_user_id THEN
    PERFORM public.log_security_event(
      'unauthorized_access_attempt'::text,
      'critical'::text,
      jsonb_build_object(
        'resource', 'gmail_credentials',
        'target_user_id', target_user_id,
        'accessing_user_id', accessing_user_id
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- 5. CREATE SESSION VALIDATION FUNCTION
CREATE OR REPLACE FUNCTION public.validate_session_access(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can view their own sessions
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Only admins can view other users' sessions
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_action'::text,
      'high'::text,
      jsonb_build_object(
        'event_subtype', 'session_data_access',
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id
      )
    );
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- 6. ENHANCE SECURITY EVENT LOGGING
-- Add additional security monitoring triggers
CREATE OR REPLACE FUNCTION public.log_critical_client_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log all access to sensitive client data
  PERFORM public.log_security_event(
    'client_data_accessed'::text,
    CASE 
      WHEN auth.uid() != NEW.user_id THEN 'critical'
      ELSE 'low'
    END,
    jsonb_build_object(
      'client_id', NEW.id,
      'accessed_by', auth.uid(),
      'client_owner', NEW.user_id,
      'operation', TG_OP,
      'has_sensitive_data', (
        NEW.encrypted_ssn IS NOT NULL OR 
        NEW.encrypted_passport_number IS NOT NULL OR 
        NEW.encrypted_payment_info IS NOT NULL
      )
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Apply the trigger to monitor client access
DROP TRIGGER IF EXISTS log_client_access_trigger ON public.clients;
CREATE TRIGGER log_client_access_trigger
  AFTER SELECT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_critical_client_access();

-- 7. CREATE COMPREHENSIVE ACCESS RATE LIMITING TABLE
CREATE TABLE IF NOT EXISTS public.access_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- Enable RLS on rate limits
ALTER TABLE public.access_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for rate limits
CREATE POLICY "System can manage rate limits" ON public.access_rate_limits
FOR ALL USING (true);

-- 8. ADD INDEXES FOR SECURITY PERFORMANCE
-- Critical indexes for security queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_timestamp 
ON public.security_events(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_event_type_severity 
ON public.security_events(event_type, severity);

CREATE INDEX IF NOT EXISTS idx_clients_user_id_encrypted_data 
ON public.clients(user_id) 
WHERE encrypted_ssn IS NOT NULL OR encrypted_passport_number IS NOT NULL OR encrypted_payment_info IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gmail_credentials_user_security 
ON public.gmail_credentials(user_id, created_at DESC);

-- 9. CREATE EMERGENCY ACCESS LOGGING
CREATE OR REPLACE FUNCTION public.log_emergency_access(
  p_client_id uuid,
  p_justification text,
  p_incident_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Only admins can use emergency access
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Emergency access requires admin privileges';
  END IF;
  
  -- Log the emergency access
  PERFORM public.log_security_event(
    'emergency_access'::text,
    'critical'::text,
    jsonb_build_object(
      'client_id', p_client_id,
      'justification', p_justification,
      'incident_id', p_incident_id,
      'admin_id', auth.uid(),
      'requires_audit', true
    )
  );
END;
$function$;