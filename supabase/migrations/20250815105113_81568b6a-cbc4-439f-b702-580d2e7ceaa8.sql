-- DROP ALL CONFLICTING FUNCTIONS AND START FRESH
DROP FUNCTION IF EXISTS public.can_access_client_data_ultra_strict(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_access_gmail_credentials_enhanced(uuid);
DROP FUNCTION IF EXISTS public.validate_session_access(uuid);

-- REMOVE BROKEN CONSTRAINT
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;

-- CREATE SIMPLE EVENT TYPE VALIDATION
ALTER TABLE public.security_events 
ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type IN (
  'login_attempt', 'login_success', 'login_failure', 'logout',
  'password_change', 'suspicious_activity', 'brute_force_attempt',
  'rate_limit_exceeded', 'unauthorized_access_attempt',
  'sensitive_data_access', 'client_data_accessed', 'client_data_modified',
  'communication_accessed', 'gmail_oauth_initiated', 'gmail_oauth_success',
  'gmail_oauth_failure', 'captcha_verified', 'captcha_failed',
  'admin_action', 'emergency_access', 'gdpr_request'
));

-- SECURE CLIENT DATA ACCESS FUNCTION  
CREATE FUNCTION public.can_access_client_data_ultra_strict(target_user_id uuid, target_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
BEGIN
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  IF user_role = 'admin' THEN
    INSERT INTO public.security_events (user_id, event_type, severity, details)
    VALUES (accessing_user_id, 'admin_action', 'critical', 
            jsonb_build_object('target_user_id', target_user_id, 'client_id', target_client_id));
    RETURN true;
  END IF;
  
  INSERT INTO public.security_events (user_id, event_type, severity, details)
  VALUES (accessing_user_id, 'unauthorized_access_attempt', 'critical', 
          jsonb_build_object('target_user_id', target_user_id, 'client_id', target_client_id));
  
  RETURN false;
END;
$function$;

-- SECURE GMAIL CREDENTIALS ACCESS FUNCTION
CREATE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
BEGIN
  IF accessing_user_id IS NULL OR accessing_user_id != target_user_id THEN
    INSERT INTO public.security_events (user_id, event_type, severity, details)
    VALUES (accessing_user_id, 'unauthorized_access_attempt', 'critical', 
            jsonb_build_object('resource', 'gmail_credentials', 'target_user_id', target_user_id));
    RETURN false;
  END IF;
  RETURN true;
END;
$function$;

-- SECURE SESSION ACCESS FUNCTION
CREATE FUNCTION public.validate_session_access(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
BEGIN
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  IF user_role = 'admin' THEN
    INSERT INTO public.security_events (user_id, event_type, severity, details)
    VALUES (accessing_user_id, 'admin_action', 'high', 
            jsonb_build_object('target_user_id', target_user_id));
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;