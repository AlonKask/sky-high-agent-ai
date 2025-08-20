
-- First, let's check if we have proper RLS policies for requests table
-- and create necessary functions for role-based access

-- Create a function to check if user has business role (agent, gds_expert, etc.)
CREATE OR REPLACE FUNCTION public.has_business_role()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'supervisor', 'gds_expert', 'agent')
  );
$$;

-- Create a function to check if user can access request
CREATE OR REPLACE FUNCTION public.can_access_request(request_user_id uuid, assigned_to_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    -- User can access their own requests
    auth.uid() = request_user_id
    OR 
    -- User can access requests assigned to them
    auth.uid() = assigned_to_id
    OR
    -- Admins can access all requests
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'supervisor')
    )
  ) AND has_business_role();
$$;

-- Update RLS policies for requests table
DROP POLICY IF EXISTS "Users can view accessible requests" ON public.requests;
CREATE POLICY "Users can view accessible requests"
ON public.requests
FOR SELECT
TO authenticated
USING (can_access_request(user_id, assigned_to));

DROP POLICY IF EXISTS "Users can create requests" ON public.requests;
CREATE POLICY "Users can create requests"
ON public.requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND has_business_role());

DROP POLICY IF EXISTS "Users can update accessible requests" ON public.requests;
CREATE POLICY "Users can update accessible requests"
ON public.requests
FOR UPDATE
TO authenticated
USING (can_access_request(user_id, assigned_to))
WITH CHECK (can_access_request(user_id, assigned_to));

-- Ensure the requests table has proper structure
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS assignment_status text DEFAULT 'available',
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON public.requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_requests_assignment_status ON public.requests(assignment_status);
