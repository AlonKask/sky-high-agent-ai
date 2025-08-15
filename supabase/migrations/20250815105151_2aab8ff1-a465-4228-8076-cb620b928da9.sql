-- SECURITY FIX: CAREFULLY HANDLE DEPENDENCIES
-- First drop policies that depend on the function
DROP POLICY IF EXISTS "ULTRA_SECURE_clients_select" ON public.clients;
DROP POLICY IF EXISTS "ULTRA_SECURE_clients_update" ON public.clients;

-- Drop the function
DROP FUNCTION IF EXISTS public.can_access_client_data_ultra_strict(uuid, uuid);

-- Remove broken constraint
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;

-- Create new constraint with valid event types
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

-- Create new secure client access function
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
  -- Must be authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can access their own client data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get user role
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  -- Only admins can access other users' client data
  IF user_role = 'admin' THEN
    -- Log admin access
    INSERT INTO public.security_events (user_id, event_type, severity, details)
    VALUES (accessing_user_id, 'admin_action', 'critical', 
            jsonb_build_object('action', 'client_data_access', 'target_user_id', target_user_id, 'client_id', target_client_id))
    ON CONFLICT DO NOTHING;
    
    RETURN true;
  END IF;
  
  -- Log unauthorized attempt
  INSERT INTO public.security_events (user_id, event_type, severity, details)
  VALUES (accessing_user_id, 'unauthorized_access_attempt', 'critical', 
          jsonb_build_object('resource', 'client_data', 'target_user_id', target_user_id, 'client_id', target_client_id))
  ON CONFLICT DO NOTHING;
  
  RETURN false;
END;
$function$;

-- Recreate the client security policies
CREATE POLICY "ULTRA_SECURE_clients_select" ON public.clients
FOR SELECT 
USING (can_access_client_data_ultra_strict(user_id, id));

CREATE POLICY "ULTRA_SECURE_clients_update" ON public.clients
FOR UPDATE 
USING (can_access_client_data_ultra_strict(user_id, id))
WITH CHECK ((auth.uid() = user_id) AND (data_classification = ANY (ARRAY['confidential'::text, 'restricted'::text, 'secret'::text])));