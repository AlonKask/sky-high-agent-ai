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

-- CRITICAL: Block ALL anonymous access to sensitive tables
CREATE POLICY "block_anonymous_clients_access" ON public.clients
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "block_anonymous_requests_access" ON public.requests  
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Ensure authenticated users can only access their own data
CREATE POLICY "authenticated_clients_owner_only" ON public.clients
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_requests_access_control" ON public.requests
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