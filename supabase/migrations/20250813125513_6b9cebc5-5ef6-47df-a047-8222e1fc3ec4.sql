-- PHASE 1: Fix Security Event Logging Issues
-- Add missing event types to prevent constraint violations

-- Update security_events table to handle all event types
ALTER TABLE IF EXISTS public.security_events 
  ALTER COLUMN event_type TYPE text;

-- Create index for better performance on security queries
CREATE INDEX IF NOT EXISTS idx_security_events_severity_timestamp 
  ON public.security_events (severity, timestamp DESC);

-- PHASE 2: Enhanced RLS Policy Validation
-- Create function to validate enhanced access controls

CREATE OR REPLACE FUNCTION public.can_access_client_data_enhanced(target_user_id uuid, client_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_authorized boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Allow users to access their own data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get the accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- For managers: Only allow access to direct team members
  IF user_role = 'manager' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_authorized;
    
    IF is_authorized THEN
      -- Log manager access with proper severity
      PERFORM public.log_security_event(
        'manager_team_data_access',
        'medium',
        jsonb_build_object(
          'manager_id', accessing_user_id,
          'target_user_id', target_user_id,
          'client_id', client_id,
          'justification', 'team_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For supervisors: Same team member restriction
  IF user_role = 'supervisor' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_authorized;
    
    IF is_authorized THEN
      PERFORM public.log_security_event(
        'supervisor_team_data_access',
        'medium',
        jsonb_build_object(
          'supervisor_id', accessing_user_id,
          'target_user_id', target_user_id,
          'client_id', client_id,
          'justification', 'team_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- Admins get full access but with critical logging
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_data_access',
      'critical',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id,
        'requires_justification', true,
        'timestamp', now()
      )
    );
    RETURN true;
  END IF;
  
  -- Log unauthorized access attempt
  PERFORM public.log_security_event(
    'unauthorized_data_access_blocked',
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

-- PHASE 3: Enhanced Gmail Credentials Security
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
  -- No admin override for Gmail credentials to prevent token theft
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  IF accessing_user_id = target_user_id THEN
    -- Log successful access to own credentials
    PERFORM public.log_security_event(
      'gmail_credentials_accessed',
      'low',
      jsonb_build_object(
        'user_id', accessing_user_id,
        'timestamp', now()
      )
    );
    RETURN true;
  END IF;
  
  -- Log and block any cross-user access attempts
  PERFORM public.log_security_event(
    'gmail_credentials_unauthorized_access',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'blocked', true,
      'timestamp', now()
    )
  );
  
  RETURN false;
END;
$$;

-- PHASE 4: Session Security Validation
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
  
  -- Users can access their own sessions
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Only admins can access other user sessions for security investigations
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  IF user_role = 'admin' THEN
    -- Log admin session access with critical severity
    PERFORM public.log_security_event(
      'admin_session_access',
      'critical',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'requires_investigation_justification', true,
        'timestamp', now()
      )
    );
    RETURN true;
  END IF;
  
  -- Block and log unauthorized session access
  PERFORM public.log_security_event(
    'unauthorized_session_access_blocked',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'user_role', user_role,
      'blocked', true,
      'timestamp', now()
    )
  );
  
  RETURN false;
END;
$$;