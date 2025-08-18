-- Phase 1b: Fix critical clients table RLS policy
-- Drop existing function with different signature
DROP FUNCTION IF EXISTS public.can_access_client_data(UUID);

-- Create simplified function to check if user can access client data
CREATE OR REPLACE FUNCTION public.can_access_client_data(client_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id UUID := auth.uid();
  client_owner_id UUID;
  user_role app_role;
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
  
  -- Get the accessing user's role (if role system exists)
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- For admins: Allow access
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- For managers/supervisors: Allow access (simplified for now)
  IF user_role IN ('manager', 'supervisor') THEN
    RETURN true;
  END IF;
  
  -- Deny all other access
  RETURN false;
END;
$$;

-- Drop and recreate the clients RLS policy with proper security
DROP POLICY IF EXISTS "Enhanced role-based client access" ON public.clients;
DROP POLICY IF EXISTS "Enhanced secure client access" ON public.clients;

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