-- Drop and recreate functions to fix search_path security warnings

DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.log_security_event(text, text, jsonb);

-- Recreate has_role function with secure search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$function$;

-- Recreate log_security_event function with secure search_path
CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_severity text, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.security_events (user_id, event_type, severity, details)
  VALUES (auth.uid(), p_event_type, p_severity, p_details);
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors to prevent breaking main functionality
  NULL;
END;
$function$;