-- SECURITY FIXES: CORRECT SYNTAX FOR POSTGRESQL
-- Step 1: Create enum type only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'security_event_type') THEN
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
    END IF;
END $$;

-- Step 2: Fix security_events table constraint
ALTER TABLE public.security_events 
DROP CONSTRAINT IF EXISTS security_events_event_type_check;

ALTER TABLE public.security_events 
ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type::text = ANY(enum_range(NULL::security_event_type)::text[]));

-- Step 3: Create missing security functions
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

-- Step 4: Create session validation function
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

-- Step 5: Create comprehensive access rate limiting
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

-- Step 6: Create indexes for security performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_timestamp 
ON public.security_events(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_event_type_severity 
ON public.security_events(event_type, severity);

CREATE INDEX IF NOT EXISTS idx_clients_user_id_encrypted_data 
ON public.clients(user_id) 
WHERE encrypted_ssn IS NOT NULL OR encrypted_passport_number IS NOT NULL OR encrypted_payment_info IS NOT NULL;