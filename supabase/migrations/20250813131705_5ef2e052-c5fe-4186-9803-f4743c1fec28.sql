-- Implement stricter client data access controls
-- Current issue: Supervisors/managers can access ALL client data
-- Fix: Restrict to only team members they directly supervise

-- Drop the current enhanced function and create a more restrictive version
DROP FUNCTION IF EXISTS public.can_access_client_data_enhanced(uuid, uuid);

-- Create stricter access control function
CREATE OR REPLACE FUNCTION public.can_access_client_data_strict(target_user_id uuid, client_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_direct_team_member boolean := false;
  client_owner_id uuid;
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
  
  -- Get client owner for logging
  SELECT user_id INTO client_owner_id
  FROM public.clients
  WHERE id = client_id;
  
  -- For managers: ONLY allow access to their DIRECT team members' clients
  IF user_role = 'manager' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      -- Log with strict justification requirement
      PERFORM public.log_security_event(
        'manager_team_client_access',
        'high',
        jsonb_build_object(
          'manager_id', accessing_user_id,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'client_owner', client_owner_id,
          'access_type', 'direct_team_supervision',
          'requires_justification', true
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For supervisors: ONLY allow access to their DIRECT team members' clients
  IF user_role = 'supervisor' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      -- Log with strict justification requirement
      PERFORM public.log_security_event(
        'supervisor_team_client_access',
        'high',
        jsonb_build_object(
          'supervisor_id', accessing_user_id,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'client_owner', client_owner_id,
          'access_type', 'direct_team_supervision',
          'requires_justification', true
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: Allow but ONLY with explicit business justification and critical logging
  IF user_role = 'admin' THEN
    -- Log as CRITICAL severity requiring business justification
    PERFORM public.log_security_event(
      'admin_client_data_access',
      'critical',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id,
        'client_owner', client_owner_id,
        'access_reason', 'admin_override',
        'requires_business_justification', true,
        'compliance_review_required', true,
        'timestamp', now()
      )
    );
    RETURN true;
  END IF;
  
  -- Deny ALL other access and log as security violation
  PERFORM public.log_security_event(
    'unauthorized_client_access_attempt',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'client_id', client_id,
      'client_owner', client_owner_id,
      'user_role', user_role,
      'denial_reason', 'insufficient_privileges',
      'security_violation', true
    )
  );
  
  RETURN false;
END;
$$;

-- Update clients table policies to use the stricter function
DROP POLICY IF EXISTS "Enhanced clients SELECT - strict access control" ON public.clients;
DROP POLICY IF EXISTS "Enhanced clients UPDATE - owner and authorized only" ON public.clients;

-- Create ultra-strict policies
CREATE POLICY "Clients SELECT - ultra strict access control"
ON public.clients
FOR SELECT
TO authenticated
USING (can_access_client_data_strict(user_id, id));

CREATE POLICY "Clients UPDATE - owner only with strict oversight"
ON public.clients
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR can_access_client_data_strict(user_id, id))
WITH CHECK (auth.uid() = user_id);

-- Create emergency access function for critical business situations
CREATE OR REPLACE FUNCTION public.emergency_client_access_request(
  p_client_id uuid,
  p_justification text,
  p_business_reason text,
  p_supervisor_approval_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
  request_id uuid;
BEGIN
  -- Only admins can initiate emergency access
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Emergency access can only be initiated by administrators';
  END IF;
  
  -- Require detailed justification
  IF p_justification IS NULL OR length(trim(p_justification)) < 20 THEN
    RAISE EXCEPTION 'Detailed justification required (minimum 20 characters)';
  END IF;
  
  IF p_business_reason IS NULL OR length(trim(p_business_reason)) < 10 THEN
    RAISE EXCEPTION 'Business reason required (minimum 10 characters)';
  END IF;
  
  -- Log emergency access request as CRITICAL
  request_id := public.log_security_event(
    'emergency_client_access_requested',
    'critical',
    jsonb_build_object(
      'requesting_admin_id', auth.uid(),
      'client_id', p_client_id,
      'justification', p_justification,
      'business_reason', p_business_reason,
      'supervisor_approval_id', p_supervisor_approval_id,
      'requires_audit_review', true,
      'compliance_flag', true,
      'timestamp', now()
    )
  );
  
  -- Return false - access must be manually approved in security dashboard
  RETURN false;
END;
$$;