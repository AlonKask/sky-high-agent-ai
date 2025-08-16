-- Drop and recreate the conflicting function with correct parameters
DROP FUNCTION IF EXISTS public.can_access_client_data_ultra_strict(uuid,uuid);

-- Recreate with correct parameter names matching existing usage
CREATE OR REPLACE FUNCTION public.can_access_client_data_ultra_strict(
  target_user_id uuid,
  target_client_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_team_member boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Allow users to access their own client data only
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get the accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- Only supervisors and admins can access other users' client data
  -- and only for direct team members
  IF user_role IN ('supervisor', 'admin') THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_team_member;
    
    IF is_team_member THEN
      -- Log access for audit
      PERFORM public.log_security_event(
        'cross_user_client_access',
        'medium',
        jsonb_build_object(
          'accessing_user', accessing_user_id,
          'target_user', target_user_id,
          'client_id', target_client_id,
          'role', user_role
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- Log unauthorized attempt
  PERFORM public.log_security_event(
    'unauthorized_client_access_blocked',
    'high',
    jsonb_build_object(
      'accessing_user', accessing_user_id,
      'target_user', target_user_id,
      'client_id', target_client_id,
      'role', user_role
    )
  );
  
  RETURN false;
END;
$$;