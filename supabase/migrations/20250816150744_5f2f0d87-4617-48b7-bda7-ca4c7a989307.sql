-- Fix all remaining functions with mutable search_path security warnings

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = p_user_id AND role = p_role
  );
END;
$function$;

-- Fix log_security_event function  
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