-- Critical RLS Policy Fixes - Step 1: Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.can_access_client_data(uuid);
DROP FUNCTION IF EXISTS public.can_access_satisfaction_scores(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_manage_user_roles(uuid);

-- Step 2: Create new enhanced security functions and policies

-- Enhanced function to check client data access with role-based permissions
CREATE OR REPLACE FUNCTION public.can_access_client_data(target_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  client_owner_id uuid;
  user_role app_role;
  is_assigned_agent boolean := false;
  is_team_member boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get the client owner
  SELECT user_id INTO client_owner_id
  FROM public.clients
  WHERE id = target_client_id;
  
  IF client_owner_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Allow owners to access their own clients
  IF accessing_user_id = client_owner_id THEN
    RETURN true;
  END IF;
  
  -- Get the accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- Check if user is an assigned agent
  SELECT EXISTS(
    SELECT 1 
    FROM public.client_assignments ca
    WHERE ca.client_id = target_client_id
    AND ca.agent_id = accessing_user_id
    AND ca.is_active = true
    AND (ca.expires_at IS NULL OR ca.expires_at > now())
  ) INTO is_assigned_agent;
  
  IF is_assigned_agent THEN
    RETURN true;
  END IF;
  
  -- Check team-based access for managers/supervisors
  IF user_role IN ('manager', 'supervisor') THEN
    -- Check if the client owner is in the accessing user's team
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = client_owner_id
    ) INTO is_team_member;
    
    IF is_team_member THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Admin access
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to check satisfaction scores access
CREATE OR REPLACE FUNCTION public.can_access_satisfaction_scores(target_client_id uuid, target_agent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Agent can view their own satisfaction scores
  IF accessing_user_id = target_agent_id THEN
    RETURN true;
  END IF;
  
  -- Client owner can view satisfaction scores for their clients
  IF EXISTS(
    SELECT 1 FROM public.clients 
    WHERE id = target_client_id 
    AND user_id = accessing_user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Get user role for elevated access
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- Managers and supervisors can view their team's satisfaction scores
  IF user_role IN ('manager', 'supervisor') THEN
    IF EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_agent_id
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Admin access
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Drop existing overly restrictive client policies
DROP POLICY IF EXISTS "Strict user access to own clients only" ON public.clients;
DROP POLICY IF EXISTS "Enhanced role-based client access" ON public.clients;

-- Create new enhanced RLS policies for clients table
CREATE POLICY "Enhanced role-based client access"
ON public.clients
FOR ALL
TO authenticated
USING (
  public.can_access_client_data(id) AND 
  public.validate_session_security()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- Update client_satisfaction_scores RLS policies
DROP POLICY IF EXISTS "Agents can view their client satisfaction scores" ON public.client_satisfaction_scores;
DROP POLICY IF EXISTS "System can create satisfaction scores" ON public.client_satisfaction_scores;
DROP POLICY IF EXISTS "Enhanced satisfaction scores access" ON public.client_satisfaction_scores;
DROP POLICY IF EXISTS "System and authorized users can create satisfaction scores" ON public.client_satisfaction_scores;

CREATE POLICY "Enhanced satisfaction scores access"
ON public.client_satisfaction_scores
FOR SELECT
TO authenticated
USING (
  public.can_access_satisfaction_scores(client_id, agent_id)
);

CREATE POLICY "System and authorized users can create satisfaction scores"
ON public.client_satisfaction_scores
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    auth.uid() = agent_id OR
    EXISTS(SELECT 1 FROM public.clients WHERE id = client_id AND user_id = auth.uid())
  )
);