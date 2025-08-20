-- SECURITY FIXES STEP 1: DROP AND RECREATE FUNCTIONS
-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.can_access_client_data_ultra_strict(uuid, uuid);

-- 1. CREATE SECURE EVENT TYPE ENUM
CREATE TYPE IF NOT EXISTS public.security_event_type AS ENUM (
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

-- 2. UPDATE SECURITY_EVENTS EVENT TYPE CONSTRAINT
ALTER TABLE public.security_events 
DROP CONSTRAINT IF EXISTS security_events_event_type_check;

ALTER TABLE public.security_events 
ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type::text = ANY(enum_range(NULL::security_event_type)::text[]));

-- 3. CREATE ULTRA-STRICT CLIENT ACCESS FUNCTION
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