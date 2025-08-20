-- Fix clients table RLS policies to ensure absolute data isolation
-- This addresses the security scan findings about exposed client data

-- First, drop the existing policy that might be causing issues
DROP POLICY IF EXISTS "Enhanced clients isolation" ON public.clients;

-- Create a stricter policy with explicit security checks
CREATE POLICY "STRICT_clients_absolute_isolation" 
ON public.clients 
FOR ALL 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND validate_session_security()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Ensure no anonymous access to clients table
CREATE POLICY "DENY_anonymous_clients_access"
ON public.clients
FOR ALL
TO anon
USING (false)
WITH CHECK (false);