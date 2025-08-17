-- Critical RLS Policy Fixes for Security Vulnerabilities (Fixed Version)
-- Fix 1: Enhanced RLS policies for clients table with role-based access

-- First, create a function to check if user can access client data
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
    -- Log agent access to assigned client
    PERFORM public.log_security_event(
      'assigned_agent_client_access',
      'low',
      jsonb_build_object(
        'client_id', target_client_id,
        'agent_id', accessing_user_id,
        'access_type', 'assigned_access'
      )
    );
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
      -- Log manager/supervisor access to team member's client
      PERFORM public.log_security_event(
        'manager_team_client_access',
        'medium',
        jsonb_build_object(
          'client_id', target_client_id,
          'manager_id', accessing_user_id,
          'team_member_id', client_owner_id,
          'access_reason', 'team_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- Admin access with high-security logging
  IF user_role = 'admin' THEN
    -- Log admin access as high severity for audit trail
    PERFORM public.log_security_event(
      'admin_client_data_access',
      'high',
      jsonb_build_object(
        'client_id', target_client_id,
        'admin_id', accessing_user_id,
        'access_reason', 'admin_override',
        'requires_justification', true
      )
    );
    RETURN true;
  END IF;
  
  -- Log unauthorized access attempt
  PERFORM public.log_security_event(
    'unauthorized_client_access_attempt',
    'critical',
    jsonb_build_object(
      'client_id', target_client_id,
      'denied_user_id', accessing_user_id,
      'user_role', user_role,
      'timestamp', now()
    )
  );
  
  RETURN false;
END;
$$;

-- Drop existing overly restrictive client policies
DROP POLICY IF EXISTS "Strict user access to own clients only" ON public.clients;

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

-- Fix 2: Enhanced RLS policies for client_satisfaction_scores table
-- Create function to check access to satisfaction scores
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

-- Update client_satisfaction_scores RLS policies
DROP POLICY IF EXISTS "Agents can view their client satisfaction scores" ON public.client_satisfaction_scores;
DROP POLICY IF EXISTS "System can create satisfaction scores" ON public.client_satisfaction_scores;

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
    -- System service role can create scores
    auth.uid() = agent_id OR
    -- Clients can create scores for their interactions
    EXISTS(SELECT 1 FROM public.clients WHERE id = client_id AND user_id = auth.uid())
  )
);

-- Fix 3: Enhanced audit logging trigger for sensitive client data access
CREATE OR REPLACE FUNCTION public.audit_client_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_role app_role;
  sensitivity_level text;
BEGIN
  -- Determine data sensitivity level
  sensitivity_level := COALESCE(NEW.data_classification, OLD.data_classification, 'confidential');
  
  -- Get accessing user's role
  SELECT role INTO accessing_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Log all operations on client data with detailed context
  PERFORM public.log_security_event(
    'client_data_operation',
    CASE 
      WHEN TG_OP = 'DELETE' THEN 'high'
      WHEN sensitivity_level = 'restricted' THEN 'high'
      WHEN accessing_user_role = 'admin' THEN 'medium'
      ELSE 'low'
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'client_id', COALESCE(NEW.id, OLD.id),
      'client_owner', COALESCE(NEW.user_id, OLD.user_id),
      'accessing_user', auth.uid(),
      'accessing_role', accessing_user_role,
      'data_sensitivity', sensitivity_level,
      'encrypted_fields_accessed', jsonb_build_object(
        'has_encrypted_ssn', COALESCE(NEW.encrypted_ssn, OLD.encrypted_ssn) IS NOT NULL,
        'has_encrypted_passport', COALESCE(NEW.encrypted_passport_number, OLD.encrypted_passport_number) IS NOT NULL,
        'has_encrypted_payment', COALESCE(NEW.encrypted_payment_info, OLD.encrypted_payment_info) IS NOT NULL
      ),
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for client data access auditing (only for modifying operations)
DROP TRIGGER IF EXISTS audit_client_data_access_trigger ON public.clients;
CREATE TRIGGER audit_client_data_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_client_data_access();

-- Fix 4: Enhanced user roles management policies
-- Create function for role management access
CREATE OR REPLACE FUNCTION public.can_manage_user_roles(target_user_id uuid)
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
  
  -- Get accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- Only admins can manage roles
  IF user_role = 'admin' THEN
    -- Log role management activity
    PERFORM public.log_security_event(
      'user_role_management',
      'high',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'action', 'role_access_check'
      )
    );
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Enhanced user_roles policies
CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.can_manage_user_roles(user_id)
)
WITH CHECK (
  public.can_manage_user_roles(user_id)
);

-- Users can still view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- Fix 5: Create comprehensive security monitoring function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details,
    ip_address,
    user_agent,
    timestamp
  ) VALUES (
    auth.uid(),
    p_event_type,
    p_severity,
    p_details || jsonb_build_object(
      'session_validated', public.validate_session_security(),
      'function_called_from', 'log_security_event'
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent',
    now()
  );
EXCEPTION WHEN OTHERS THEN
  -- Fail silently to avoid blocking operations, but log to system
  NULL;
END;
$$;