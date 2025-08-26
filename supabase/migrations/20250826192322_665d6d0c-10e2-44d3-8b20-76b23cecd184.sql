-- Drop all existing log_security_event functions completely
DROP FUNCTION IF EXISTS public.log_security_event(text, text, jsonb);
DROP FUNCTION IF EXISTS public.log_security_event(text, text, jsonb, uuid);
DROP FUNCTION IF EXISTS public.log_security_event(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.log_security_event(unknown, text, jsonb);

-- Drop log_oauth_operation if it exists and is causing issues
DROP FUNCTION IF EXISTS public.log_oauth_operation(uuid, text, boolean, jsonb);

-- Create simple logging functions with explicit parameter types
CREATE OR REPLACE FUNCTION public.simple_log_event(
  p_user_id uuid,
  p_event_type text,
  p_severity text DEFAULT 'low',
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simple insert with error handling
  INSERT INTO public.security_events (
    user_id, event_type, severity, details, timestamp
  ) VALUES (
    COALESCE(p_user_id, auth.uid()),
    p_event_type,
    p_severity,
    p_details,
    now()
  );
EXCEPTION WHEN OTHERS THEN
  -- Don't break the calling operation if logging fails
  NULL;
END;
$$;