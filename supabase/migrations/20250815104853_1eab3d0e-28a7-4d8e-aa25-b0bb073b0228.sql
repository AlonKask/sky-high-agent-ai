-- CRITICAL SECURITY FIX: STEP BY STEP APPROACH
-- First, remove the problematic constraint
ALTER TABLE public.security_events 
DROP CONSTRAINT IF EXISTS security_events_event_type_check;

-- Create simple check constraint that allows the event types we're using
ALTER TABLE public.security_events 
ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type IN (
  'login_attempt',
  'login_success', 
  'login_failure',
  'logout',
  'password_change',
  'suspicious_activity',
  'brute_force_attempt',
  'rate_limit_exceeded',
  'unauthorized_access_attempt',
  'sensitive_data_access',
  'client_data_accessed',
  'client_data_modified',
  'communication_accessed',
  'gmail_oauth_initiated',
  'gmail_oauth_success',
  'gmail_oauth_failure',
  'captcha_verified',
  'captcha_failed',
  'admin_action',
  'emergency_access',
  'gdpr_request'
));

-- Create secure access function for client data
CREATE OR REPLACE FUNCTION public.can_access_client_data_ultra_strict(target_user_id uuid, target_client_id uuid)
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
  
  -- Only allow admins to access other users' client data with logging
  IF user_role = 'admin' THEN
    INSERT INTO public.security_events (user_id, event_type, severity, details)
    VALUES (
      accessing_user_id,
      'admin_action',
      'critical',
      jsonb_build_object(
        'event_subtype', 'admin_client_data_access',
        'target_user_id', target_user_id,
        'client_id', target_client_id,
        'timestamp', now()
      )
    );
    RETURN true;
  END IF;
  
  -- Deny all other access
  INSERT INTO public.security_events (user_id, event_type, severity, details)
  VALUES (
    accessing_user_id,
    'unauthorized_access_attempt',
    'critical',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'target_client_id', target_client_id,
      'user_role', user_role
    )
  );
  
  RETURN false;
END;
$function$;

-- Create enhanced Gmail credentials access function  
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
    INSERT INTO public.security_events (user_id, event_type, severity, details)
    VALUES (
      accessing_user_id,
      'unauthorized_access_attempt',
      'critical',
      jsonb_build_object(
        'resource', 'gmail_credentials',
        'target_user_id', target_user_id
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- Create session validation function
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
    INSERT INTO public.security_events (user_id, event_type, severity, details)
    VALUES (
      accessing_user_id,
      'admin_action',
      'high',
      jsonb_build_object(
        'event_subtype', 'session_data_access',
        'target_user_id', target_user_id
      )
    );
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;