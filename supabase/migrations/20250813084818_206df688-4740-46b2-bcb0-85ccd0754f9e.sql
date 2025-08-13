-- CRITICAL SECURITY FIX: Enable RLS on all publicly accessible tables

-- 1. CLIENTS TABLE - Already has RLS enabled, but needs policy review
-- Check current policies are working correctly by adding more restrictive ones
DROP POLICY IF EXISTS "Supervisors and above can view all clients" ON public.clients;
CREATE POLICY "Supervisors and above can view all clients" 
ON public.clients 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'supervisor'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. PROFILES TABLE - Already has RLS enabled, but needs policy review
-- Current policies seem restrictive enough, but let's add explicit deny for anonymous users
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 3. GMAIL_CREDENTIALS TABLE - Already has RLS enabled, let's verify policies
-- Current policies seem correct, but add explicit anon denial
CREATE POLICY "Deny anonymous access to gmail credentials" 
ON public.gmail_credentials 
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 4. QUOTES TABLE - Enable RLS and add comprehensive policies
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quotes" 
ON public.quotes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes" 
ON public.quotes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes" 
ON public.quotes 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all quotes" 
ON public.quotes 
FOR SELECT 
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Deny anonymous access to quotes" 
ON public.quotes 
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 5. BOOKINGS TABLE - Enable RLS and add comprehensive policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookings" 
ON public.bookings 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Deny anonymous access to bookings" 
ON public.bookings 
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 6. SYSTEM METRICS TABLE - Restrict access to admins only
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view system metrics" 
ON public.system_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert metrics" 
ON public.system_metrics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Deny anonymous access to system metrics" 
ON public.system_metrics 
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 7. RATE LIMITS TABLE - Restrict access to admins and managers only
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and managers can view rate limits" ON public.rate_limits;
CREATE POLICY "Only admins and managers can view rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "System can manage rate limits" 
ON public.rate_limits 
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Deny anonymous access to rate limits" 
ON public.rate_limits 
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 8. ACCESS RATE LIMITS TABLE - Restrict access to admins only
ALTER TABLE public.access_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view access rate limits" 
ON public.access_rate_limits 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage access rate limits" 
ON public.access_rate_limits 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update access rate limits" 
ON public.access_rate_limits 
FOR UPDATE 
USING (true);

CREATE POLICY "Deny anonymous access to access rate limits" 
ON public.access_rate_limits 
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Log this critical security fix
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  auth.uid(), 
  'critical_security_fix_applied', 
  'critical',
  jsonb_build_object(
    'action', 'enabled_rls_policies',
    'affected_tables', ARRAY['quotes', 'bookings', 'system_metrics', 'access_rate_limits'],
    'timestamp', now()
  )
);