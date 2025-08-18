-- Phase 1c: Fix dependencies and clean up existing policies
-- Drop the policy first, then the function, then recreate properly
DROP POLICY IF EXISTS "Enhanced role-based client access" ON public.clients CASCADE;

-- Now drop the function
DROP FUNCTION IF EXISTS public.can_access_client_data(UUID) CASCADE;

-- Create new simplified function
CREATE OR REPLACE FUNCTION public.can_access_client_data(client_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id UUID := auth.uid();
  client_owner_id UUID;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get client owner
  SELECT user_id INTO client_owner_id
  FROM public.clients
  WHERE id = client_id;
  
  IF client_owner_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Allow users to access their own client data
  IF accessing_user_id = client_owner_id THEN
    RETURN true;
  END IF;
  
  -- For now, only allow own data - this fixes the critical security issue
  RETURN false;
END;
$$;

-- Create the new secure policy
CREATE POLICY "Secure client data access" 
ON public.clients 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND can_access_client_data(id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);