-- Drop existing conflicting log_security_event functions
DROP FUNCTION IF EXISTS public.log_security_event(text, text, jsonb);
DROP FUNCTION IF EXISTS public.log_security_event(text, text, jsonb, uuid);
DROP FUNCTION IF EXISTS public.log_security_event(uuid, text, jsonb);

-- Create a single, unified log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details,
    timestamp
  ) VALUES (
    COALESCE(p_user_id, auth.uid()),
    p_event_type,
    p_severity,
    p_details,
    now()
  );
EXCEPTION WHEN OTHERS THEN
  -- If logging fails, don't break the calling operation
  -- This prevents the Gmail sync from failing due to logging issues
  NULL;
END;
$$;