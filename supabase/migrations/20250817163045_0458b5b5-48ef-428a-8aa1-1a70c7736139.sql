-- Drop and recreate the mask_sensitive_data function with proper syntax
DROP FUNCTION IF EXISTS public.mask_sensitive_data(text, text);

CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data text, mask_type text DEFAULT 'email'::text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE STRICT
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF mask_type = 'email' THEN
    IF data ~ '^[^@]+@[^@]+\.[^@]+$' THEN 
      RETURN SUBSTRING(data FROM 1 FOR 3) || '***@' || SPLIT_PART(data, '@', 2);
    ELSE 
      RETURN data;
    END IF;
  ELSIF mask_type = 'phone' THEN
    IF LENGTH(data) >= 10 THEN 
      RETURN 'XXX-XXX-' || RIGHT(data, 4);
    ELSE 
      RETURN data;
    END IF;
  ELSIF mask_type = 'ssn' THEN
    IF LENGTH(data) >= 9 THEN 
      RETURN 'XXX-XX-' || RIGHT(data, 4);
    ELSE 
      RETURN data;
    END IF;
  ELSIF mask_type = 'passport' THEN
    IF LENGTH(data) >= 6 THEN 
      RETURN REPEAT('X', LENGTH(data) - 4) || RIGHT(data, 4);
    ELSE 
      RETURN data;
    END IF;
  ELSE
    RETURN data;
  END IF;
END;
$function$;

-- Create business hours validation function
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
  
  -- Get current hour and day
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