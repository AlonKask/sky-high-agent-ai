-- PHASE 4: Final Security Hardening - Enable RLS and Complete Isolation

-- Ensure RLS is enabled on all sensitive tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.email_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Add isolation policy for requests table
CREATE POLICY "requests_absolute_isolation"
ON public.requests
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Apply monitoring to requests table
CREATE TRIGGER comprehensive_requests_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.comprehensive_security_monitor();

-- Create security validation check
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count,
  CASE 
    WHEN rowsecurity = true AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) = 1 THEN 'SECURE'
    WHEN rowsecurity = false THEN 'CRITICAL_RLS_DISABLED'
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) = 0 THEN 'CRITICAL_NO_POLICIES' 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) > 1 THEN 'RISK_MULTIPLE_POLICIES'
    ELSE 'UNKNOWN'
  END as security_status
FROM pg_tables t 
WHERE schemaname = 'public' 
  AND tablename IN ('clients', 'quotes', 'email_exchanges', 'bookings', 'requests')
ORDER BY tablename;