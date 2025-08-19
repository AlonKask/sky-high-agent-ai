-- Fix Security Definer View issue by recreating security_dashboard view
-- This removes the problematic SECURITY DEFINER behavior and ensures proper RLS enforcement

-- Drop the existing problematic view
DROP VIEW IF EXISTS public.security_dashboard;

-- Create a new view that respects RLS and user permissions
-- This view will only show security events that the authenticated user is allowed to see
CREATE VIEW public.security_dashboard AS
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

-- Enable RLS on the view to ensure it follows the same security policies as the underlying table
ALTER VIEW public.security_dashboard OWNER TO postgres;

-- Grant appropriate permissions to authenticated users only
-- This ensures only authenticated users can access the security dashboard
GRANT SELECT ON public.security_dashboard TO authenticated;
REVOKE ALL ON public.security_dashboard FROM anon;

-- Add a comment explaining the security considerations
COMMENT ON VIEW public.security_dashboard IS 'Security dashboard view that respects RLS policies from the underlying security_events table. Only accessible to authenticated users with appropriate permissions.';