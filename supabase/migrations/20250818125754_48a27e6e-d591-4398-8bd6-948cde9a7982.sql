-- Phase 1a: Fix existing security functions and create proper structure
-- Drop existing function with different signature
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role);

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  );
$$;

-- Create function to check if user can access client data
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
  is_direct_team_member BOOLEAN := false;
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
  
  -- Get the accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- For managers/supervisors: Only allow access to direct team members' clients
  IF user_role IN ('manager', 'supervisor') THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = client_owner_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      -- Log access for audit (only if log function exists)
      BEGIN
        PERFORM public.log_security_event(
          'manager_team_client_access',
          'medium',
          jsonb_build_object(
            'manager_id', accessing_user_id,
            'team_member_id', client_owner_id,
            'client_id', client_id,
            'justification', 'manager_oversight'
          )
        );
      EXCEPTION WHEN undefined_function THEN
        -- Log function doesn't exist, continue without logging
        NULL;
      END;
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: Allow but with heavy logging
  IF user_role = 'admin' THEN
    -- Log admin access as high severity security event
    BEGIN
      PERFORM public.log_security_event(
        'admin_client_data_access',
        'high',
        jsonb_build_object(
          'admin_id', accessing_user_id,
          'client_owner_id', client_owner_id,
          'client_id', client_id,
          'access_reason', 'admin_override',
          'requires_justification', true,
          'timestamp', now()
        )
      );
    EXCEPTION WHEN undefined_function THEN
      -- Log function doesn't exist, continue without logging
      NULL;
    END;
    
    RETURN true;
  END IF;
  
  -- Deny all other access
  RETURN false;
END;
$$;