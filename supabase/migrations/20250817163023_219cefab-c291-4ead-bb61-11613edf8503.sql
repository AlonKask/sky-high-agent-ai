-- Drop and recreate the mask_sensitive_data function to fix security warning
DROP FUNCTION IF EXISTS public.mask_sensitive_data(text, text);

CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data text, mask_type text DEFAULT 'email'::text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE STRICT
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  CASE mask_type
    WHEN 'email' THEN
      RETURN CASE 
        WHEN data ~ '^[^@]+@[^@]+\.[^@]+$' THEN 
          SUBSTRING(data FROM 1 FOR 3) || '***@' || SPLIT_PART(data, '@', 2)
        ELSE data
      END;
    WHEN 'phone' THEN
      RETURN CASE 
        WHEN LENGTH(data) >= 10 THEN 
          'XXX-XXX-' || RIGHT(data, 4)
        ELSE data
      END;
    WHEN 'ssn' THEN
      RETURN CASE 
        WHEN LENGTH(data) >= 9 THEN 
          'XXX-XX-' || RIGHT(data, 4)
        ELSE data
      END;
    WHEN 'passport' THEN
      RETURN CASE 
        WHEN LENGTH(data) >= 6 THEN 
          REPEAT('X', LENGTH(data) - 4) || RIGHT(data, 4)
        ELSE data
      END;
    ELSE
      RETURN data
  END CASE;
END;
$function$;

-- Create business hours validation function for enhanced security
CREATE OR REPLACE FUNCTION public.validate_business_hours_access()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_hour integer;
  current_day integer;
  user_role app_role;
BEGIN
  -- Get current user role
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Admins bypass business hours restrictions
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Get current hour and day (0 = Sunday, 6 = Saturday)
  current_hour := EXTRACT(hour FROM now() AT TIME ZONE 'UTC');
  current_day := EXTRACT(dow FROM now() AT TIME ZONE 'UTC');
  
  -- Allow access during business hours (9 AM to 6 PM, Monday to Friday)
  IF current_day BETWEEN 1 AND 5 AND current_hour BETWEEN 9 AND 18 THEN
    RETURN true;
  END IF;
  
  -- Log after-hours access attempt
  PERFORM public.log_security_event(
    'after_hours_access_attempt',
    'medium',
    jsonb_build_object(
      'current_hour', current_hour,
      'current_day', current_day,
      'user_role', user_role
    )
  );
  
  RETURN false;
END;
$function$;