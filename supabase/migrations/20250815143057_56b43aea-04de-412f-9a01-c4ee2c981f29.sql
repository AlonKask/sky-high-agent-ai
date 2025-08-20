-- Fix the log_security_event function search_path issue
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, severity, details, timestamp
  ) VALUES (
    COALESCE(p_user_id, auth.uid()), 
    p_event_type, 
    p_severity, 
    p_details, 
    now()
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$function$;