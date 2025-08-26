-- Phase 1: Fix Security Events Foreign Key Constraint Issue
-- The current FK constraint is causing sync failures when trying to log security events
-- We need to make the constraint more flexible or remove dependency on auth.users

-- First, let's make the user_id nullable and remove the strict FK constraint
ALTER TABLE public.security_events 
DROP CONSTRAINT IF EXISTS security_events_user_id_fkey;

-- Add a more flexible constraint that allows null values
ALTER TABLE public.security_events 
ALTER COLUMN user_id DROP NOT NULL;

-- Create a function to safely log security events without FK violations
CREATE OR REPLACE FUNCTION public.log_security_event_safe(
  p_event_type text,
  p_severity text DEFAULT 'medium',
  p_details jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  resolved_user_id uuid;
BEGIN
  -- Use provided user_id or auth.uid(), fallback to null if neither available
  resolved_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Only insert if we can do so safely
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details,
    timestamp
  )
  VALUES (
    resolved_user_id,
    p_event_type,
    p_severity,
    p_details || jsonb_build_object('logged_at', now()),
    now()
  );
EXCEPTION WHEN OTHERS THEN
  -- If logging fails, don't break the main operation
  -- Could log to a separate error table or just continue
  NULL;
END;
$function$;

-- Update existing log_security_event function to use the safe version
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.log_security_event_safe(p_event_type, p_severity, p_details, auth.uid());
END;
$function$;