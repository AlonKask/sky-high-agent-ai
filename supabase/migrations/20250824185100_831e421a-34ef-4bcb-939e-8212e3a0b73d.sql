-- Fix the security logging function to handle migration scenarios properly
CREATE OR REPLACE FUNCTION public.log_sensitive_table_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log if we have a proper authenticated user context
  -- Skip logging for service role operations (migrations, etc.)
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.security_events (
      user_id, event_type, severity, details
    ) VALUES (
      auth.uid(),
      'sensitive_table_access',
      'low',
      jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', COALESCE(NEW.id, OLD.id),
        'authenticated', true,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;