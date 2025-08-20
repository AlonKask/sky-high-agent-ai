-- CRITICAL SECURITY FIX: Ensure clients and requests tables are NOT publicly accessible
-- This addresses the security scan findings about public data exposure

-- Drop any problematic policies that might allow public access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.clients;
DROP POLICY IF EXISTS "Allow public read access" ON public.clients;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.requests;
DROP POLICY IF EXISTS "Allow public read access" ON public.requests;

-- Ensure RLS is enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Ensure STRICT access control for clients table
-- Users can only access their own client data
CREATE POLICY "clients_strict_owner_access" ON public.clients
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure STRICT access control for requests table
-- Users can only access their own requests or requests assigned to them
CREATE POLICY "requests_strict_access_control" ON public.requests
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id OR 
  auth.uid() = assigned_to OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'supervisor')
  )
)
WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'supervisor')
  )
);

-- CRITICAL: Block ALL anonymous access to sensitive tables
CREATE POLICY "block_anonymous_clients" ON public.clients
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "block_anonymous_requests" ON public.requests  
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Log this critical security fix
SELECT public.log_security_event(
  'critical_rls_hardening',
  'critical',
  jsonb_build_object(
    'action', 'blocked_public_access_to_sensitive_tables',
    'tables', ARRAY['clients', 'requests'],
    'timestamp', now()
  )
);