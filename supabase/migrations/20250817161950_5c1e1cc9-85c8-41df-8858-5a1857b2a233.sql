-- Add time-based access control and business hours validation
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
  -- Get current time info
  current_hour := EXTRACT(hour FROM now() AT TIME ZONE 'UTC');
  current_day := EXTRACT(dow FROM now() AT TIME ZONE 'UTC');
  
  -- Get user role
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Admins have 24/7 access but with logging
  IF user_role = 'admin' THEN
    IF current_hour < 6 OR current_hour > 22 OR current_day IN (0, 6) THEN
      PERFORM public.log_security_event(
        'after_hours_admin_access',
        'high',
        jsonb_build_object(
          'admin_id', auth.uid(),
          'access_time', now(),
          'hour', current_hour,
          'day_of_week', current_day
        )
      );
    END IF;
    RETURN true;
  END IF;
  
  -- Regular business hours: 6 AM to 10 PM, Monday-Saturday
  IF current_hour >= 6 AND current_hour <= 22 AND current_day BETWEEN 1 AND 6 THEN
    RETURN true;
  END IF;
  
  -- Log after-hours access attempt
  PERFORM public.log_security_event(
    'after_hours_access_denied',
    'medium',
    jsonb_build_object(
      'user_id', auth.uid(),
      'user_role', user_role,
      'access_time', now(),
      'hour', current_hour,
      'day_of_week', current_day
    )
  );
  
  RETURN false;
END;
$function$