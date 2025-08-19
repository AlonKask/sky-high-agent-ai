-- Complete fix for Security Definer View issue
-- Replace the problematic view with a secure function-based approach

-- Drop the problematic view completely
DROP VIEW IF EXISTS public.security_dashboard;

-- Create a SECURITY INVOKER function instead of a SECURITY DEFINER view
-- This ensures that the function runs with the permissions of the calling user, not the creator
CREATE OR REPLACE FUNCTION public.get_security_dashboard()
RETURNS TABLE(
  critical_events bigint,
  high_events bigint,
  medium_events bigint,
  low_events bigint,
  events_last_24h bigint,
  auth_events_24h bigint,
  unauthorized_attempts_24h bigint,
  last_security_event timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY INVOKER  -- This is the key difference - uses caller's permissions, not creator's
SET search_path = public
AS $$
  SELECT 
    count(*) FILTER (WHERE (severity = 'critical'::text)) AS critical_events,
    count(*) FILTER (WHERE (severity = 'high'::text)) AS high_events,
    count(*) FILTER (WHERE (severity = 'medium'::text)) AS medium_events,
    count(*) FILTER (WHERE (severity = 'low'::text)) AS low_events,
    count(*) FILTER (WHERE ("timestamp" > (now() - '24:00:00'::interval))) AS events_last_24h,
    count(*) FILTER (WHERE ((event_type = 'authentication'::text) AND ("timestamp" > (now() - '24:00:00'::interval)))) AS auth_events_24h,
    count(*) FILTER (WHERE ((event_type = 'unauthorized_access_attempt'::text) AND ("timestamp" > (now() - '24:00:00'::interval)))) AS unauthorized_attempts_24h,
    max("timestamp") AS last_security_event
  FROM public.security_events
  WHERE ("timestamp" > (now() - '7 days'::interval));
$$;

-- Grant execute permissions only to authenticated users
GRANT EXECUTE ON FUNCTION public.get_security_dashboard() TO authenticated;
REVOKE ALL ON FUNCTION public.get_security_dashboard() FROM anon;

-- Add security comment
COMMENT ON FUNCTION public.get_security_dashboard() IS 'Security dashboard function that uses SECURITY INVOKER to ensure proper RLS enforcement. Respects the calling user permissions on security_events table.';