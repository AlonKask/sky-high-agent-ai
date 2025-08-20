-- Fix all remaining functions with mutable search_path
-- Update update_airline_logo function
CREATE OR REPLACE FUNCTION public.update_airline_logo(p_airline_id uuid, p_logo_url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.airline_codes
  SET logo_url = p_logo_url,
      updated_at = now()
  WHERE id = p_airline_id;
END;
$function$;

-- Update update_airline_updated_at function
CREATE OR REPLACE FUNCTION public.update_airline_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Update log_security_event function if needed
SELECT count(*) FROM pg_proc WHERE proname = 'log_security_event';