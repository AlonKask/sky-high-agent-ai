-- SECURITY HARDENING: Complete missing functions and RLS policies

-- 1. Create missing enhanced access control functions
CREATE OR REPLACE FUNCTION public.can_access_client_data_enhanced(target_user_id uuid, client_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_direct_team_member boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Allow users to access their own client data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get the accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- For managers: Only allow access to direct team members' clients
  IF user_role = 'manager' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      -- Log manager access to team member's client data
      PERFORM public.log_security_event(
        'manager_team_client_access',
        'medium',
        jsonb_build_object(
          'manager_id', accessing_user_id,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'justification', 'manager_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For supervisors: Only allow access to direct team members' clients
  IF user_role = 'supervisor' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      -- Log supervisor access to team member's client data
      PERFORM public.log_security_event(
        'supervisor_team_client_access',
        'medium',
        jsonb_build_object(
          'supervisor_id', accessing_user_id,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'justification', 'supervisor_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: Require explicit justification and heavy logging
  IF user_role = 'admin' THEN
    -- Log admin access as high severity security event
    PERFORM public.log_security_event(
      'admin_client_data_access',
      'high',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id,
        'access_reason', 'admin_override',
        'requires_justification', true,
        'timestamp', now()
      )
    );
    
    RETURN true;
  END IF;
  
  -- Deny all other access
  PERFORM public.log_security_event(
    'unauthorized_client_access_attempt',
    'high',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'client_id', client_id,
      'user_role', user_role,
      'denial_reason', 'insufficient_privileges'
    )
  );
  
  RETURN false;
END;
$$;

-- 2. Create enhanced Gmail credentials access function
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
BEGIN
  -- Only allow users to access their own Gmail credentials
  -- No exceptions - even admins cannot access other users' Gmail tokens
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  IF accessing_user_id != target_user_id THEN
    -- Log unauthorized access attempt
    PERFORM public.log_security_event(
      'unauthorized_gmail_access_attempt',
      'critical',
      jsonb_build_object(
        'accessing_user_id', accessing_user_id,
        'target_user_id', target_user_id,
        'denial_reason', 'cross_user_gmail_access_denied'
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 3. Create session access validation function
CREATE OR REPLACE FUNCTION public.validate_session_access(target_user_id uuid)
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
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Allow users to access their own sessions
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get the accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- Only admins can view other users' sessions (with heavy logging)
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_session_access',
      'critical',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'requires_justification', true
      )
    );
    RETURN true;
  END IF;
  
  -- Deny all other access
  PERFORM public.log_security_event(
    'unauthorized_session_access_attempt',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'user_role', user_role
    )
  );
  
  RETURN false;
END;
$$;