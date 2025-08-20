-- Create missing database functions that the auth system expects

-- Simple health check function that doesn't depend on auth.uid()
CREATE OR REPLACE FUNCTION public.simple_health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  db_time timestamp;
BEGIN
  -- Check database connectivity and basic operations
  SELECT now() INTO db_time;
  
  result := jsonb_build_object(
    'status', 'healthy',
    'timestamp', db_time,
    'database', 'connected',
    'version', '1.0.0'
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'error',
    'message', SQLERRM,
    'timestamp', now()
  );
END;
$$;

-- Create missing security functions used by auth system
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  )
  VALUES (
    p_user_id,
    p_event_type,
    p_severity,
    p_details
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
EXCEPTION WHEN OTHERS THEN
  -- If security events table doesn't exist or fails, return null but don't error
  RETURN null;
END;
$$;

-- Create a function to check if user roles exist
CREATE OR REPLACE FUNCTION public.check_user_roles_exists()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
  );
$$;