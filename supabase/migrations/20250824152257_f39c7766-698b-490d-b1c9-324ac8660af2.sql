-- Fix the overly restrictive clients RLS policy
-- Remove the business hours validation that blocks legitimate 24/7 access

DROP POLICY IF EXISTS "BULLETPROOF_clients_security" ON public.clients;

-- Create a simplified but secure RLS policy
-- Only checks authentication and user ownership (no business hours restriction)
CREATE POLICY "clients_user_access_policy" 
ON public.clients 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
) 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);