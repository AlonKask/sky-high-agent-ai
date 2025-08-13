-- Phase 1: Critical RLS Policy Fixes and Missing Security Functions
-- Fix function signature conflicts

-- Drop existing function with different signature
DROP FUNCTION IF EXISTS public.can_access_client_data_enhanced(uuid);
DROP FUNCTION IF EXISTS public.can_access_client_data_enhanced(uuid, uuid);

-- Function to validate session access (referenced in user_sessions RLS)
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
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can access their own sessions
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- Only admins can access other users' sessions
  IF user_role = 'admin' THEN
    -- Log admin session access
    PERFORM public.log_security_event(
      'admin_session_access',
      'high',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'justification', 'admin_session_management'
      )
    );
    RETURN true;
  END IF;
  
  -- Log unauthorized session access attempt
  PERFORM public.log_security_event(
    'unauthorized_session_access',
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

-- Function to check financial data access
CREATE OR REPLACE FUNCTION public.can_access_financial_data(target_user_id uuid)
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
  
  -- Users can access their own financial data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- Only managers and admins can access other users' financial data
  IF user_role IN ('manager', 'admin') THEN
    -- Log financial data access
    PERFORM public.log_security_event(
      'financial_data_access',
      'high',
      jsonb_build_object(
        'accessing_user_id', accessing_user_id,
        'target_user_id', target_user_id,
        'user_role', user_role,
        'justification', 'manager_financial_oversight'
      )
    );
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to enhance client data access with client_id parameter
CREATE OR REPLACE FUNCTION public.can_access_client_data_enhanced(target_user_id uuid, client_id uuid)
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
  
  -- Users can access their own client data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- For managers and supervisors: Only allow access to direct team members' clients
  IF user_role IN ('manager', 'supervisor') THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_team_member;
    
    IF is_team_member THEN
      -- Log team oversight access
      PERFORM public.log_security_event(
        'team_client_data_access',
        'medium',
        jsonb_build_object(
          'manager_id', accessing_user_id,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'user_role', user_role
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: Allow but with heavy logging
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_client_data_access',
      'critical',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id,
        'requires_justification', true
      )
    );
    RETURN true;
  END IF;
  
  -- Log unauthorized access attempt
  PERFORM public.log_security_event(
    'unauthorized_client_data_access',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'client_id', client_id,
      'user_role', user_role
    )
  );
  
  RETURN false;
END;
$$;

-- Function to enhance Gmail credentials access
DROP FUNCTION IF EXISTS public.can_access_gmail_credentials_enhanced(uuid);

CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- STRICT: Users can ONLY access their own Gmail credentials
  -- No admin override for Gmail credentials due to OAuth sensitivity
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Log any attempt to access other users' Gmail credentials
  PERFORM public.log_security_event(
    'unauthorized_gmail_credentials_access',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'violation_type', 'cross_user_gmail_access'
    )
  );
  
  RETURN false;
END;
$$;