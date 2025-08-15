-- Fix remaining function search_path vulnerabilities

-- Update all remaining functions with proper search_path settings
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
BEGIN
  -- Must be authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can ONLY access their own Gmail credentials
  IF accessing_user_id = target_user_id THEN
    -- Log legitimate access
    PERFORM public.log_security_event(
      'gmail_credentials_accessed',
      'low',
      jsonb_build_object('user_id', target_user_id, 'legitimate_access', true)
    );
    RETURN true;
  END IF;
  
  -- Log unauthorized attempt
  PERFORM public.log_security_event(
    'unauthorized_sensitive_access',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'resource', 'gmail_credentials',
      'denial_reason', 'cross_user_access_denied'
    )
  );
  
  RETURN false;
END;
$function$;

-- Update all other security-critical functions with search_path
CREATE OR REPLACE FUNCTION public.validate_session_access(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can view their own sessions
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Only admins can view other users' sessions
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_action'::text,
      'high'::text,
      jsonb_build_object(
        'event_subtype', 'session_data_access',
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id
      )
    );
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_access_communication_data(target_user_id uuid, client_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_authorized boolean := false;
BEGIN
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can access their own communications
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  -- Supervisors and managers can access team communications with restrictions
  IF user_role IN ('supervisor', 'manager') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE (t.manager_id = accessing_user_id OR tm.user_id = accessing_user_id)
      AND tm.user_id = target_user_id
    ) INTO is_authorized;
    
    IF is_authorized THEN
      PERFORM public.log_security_event(
        'admin_action',
        'medium',
        jsonb_build_object(
          'event_subtype', 'communication_oversight_access',
          'supervisor_id', accessing_user_id,
          'target_user_id', target_user_id,
          'client_id', client_id,
          'role', user_role,
          'justification', 'team_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- Admins require high-level logging
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_action',
      'high',
      jsonb_build_object(
        'event_subtype', 'admin_communication_access',
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id,
        'requires_justification', true
      )
    );
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_access_client_data_secure(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        'access_reason', 'admin_override',
        'requires_justification', true,
        'timestamp', now()
      )
    );
    
    -- Also log to sensitive data access table
    PERFORM public.log_sensitive_data_access(
      target_user_id,
      'client_data_admin_access',
      'ADMIN OVERRIDE - Requires business justification'
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
      'user_role', user_role,
      'denial_reason', 'insufficient_privileges'
    )
  );
  
  RETURN false;
END;
$function$;