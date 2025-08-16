-- Fix remaining functions with mutable search_path
CREATE OR REPLACE FUNCTION public.cleanup_old_security_events()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Archive critical and high severity events older than 2 years
  -- Delete medium and low severity events older than 6 months
  DELETE FROM public.security_events 
  WHERE severity IN ('low', 'medium') 
  AND timestamp < now() - INTERVAL '6 months';
  
  DELETE FROM public.security_events 
  WHERE severity = 'high' 
  AND timestamp < now() - INTERVAL '2 years';
  
  -- Keep critical events indefinitely for compliance
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_teams_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;