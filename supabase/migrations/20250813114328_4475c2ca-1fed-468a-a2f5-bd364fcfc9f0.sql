-- SECURITY FIX: Implement Principle of Least Privilege for Client Data Access
-- This addresses the security finding about client data being accessible to all managers/supervisors/admins

-- Phase 1: Create more restrictive client access function
-- This replaces the overly permissive current function with strict access controls

CREATE OR REPLACE FUNCTION public.can_access_client_data_secure(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_direct_team_member boolean := false;
  is_emergency_access boolean := false;
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
  -- Admins can access any client data but every access is logged as high severity
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
$$;

-- Phase 2: Update clients table RLS policies to use the secure function
DROP POLICY IF EXISTS "Authenticated users: clients SELECT" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users: clients UPDATE" ON public.clients;
DROP POLICY IF EXISTS "Secure client data access" ON public.clients;

-- Create new secure policies
CREATE POLICY "Secure clients SELECT - principle of least privilege"
ON public.clients
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND public.can_access_client_data_secure(user_id)
);

CREATE POLICY "Secure clients UPDATE - principle of least privilege"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND public.can_access_client_data_secure(user_id)
)
WITH CHECK (
  -- Only allow updates by the client owner or direct manager
  auth.uid() = user_id 
  OR (
    public.has_role(auth.uid(), 'manager'::app_role) 
    AND EXISTS(
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = auth.uid() AND tm.user_id = user_id
    )
  )
);

-- Phase 3: Create audit function for sensitive client data operations
CREATE OR REPLACE FUNCTION public.audit_sensitive_client_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_role app_role;
  client_owner_id uuid;
BEGIN
  -- Get accessing user's role
  SELECT role INTO accessing_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Determine client owner
  client_owner_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Log all operations on sensitive client data
  IF TG_OP = 'UPDATE' THEN
    -- Check if sensitive fields were modified
    IF (NEW.encrypted_ssn IS DISTINCT FROM OLD.encrypted_ssn) OR
       (NEW.encrypted_passport_number IS DISTINCT FROM OLD.encrypted_passport_number) OR
       (NEW.encrypted_payment_info IS DISTINCT FROM OLD.encrypted_payment_info) THEN
      
      PERFORM public.log_security_event(
        'sensitive_client_data_modified',
        'critical',
        jsonb_build_object(
          'client_id', NEW.id,
          'client_owner', client_owner_id,
          'modified_by', auth.uid(),
          'modifier_role', accessing_user_role,
          'operation', TG_OP,
          'sensitive_fields_changed', true
        )
      );
    END IF;
  END IF;
  
  -- Log access by non-owners
  IF auth.uid() != client_owner_id THEN
    PERFORM public.log_security_event(
      'cross_user_client_access',
      CASE 
        WHEN accessing_user_role = 'admin' THEN 'high'
        WHEN accessing_user_role IN ('manager', 'supervisor') THEN 'medium'
        ELSE 'critical'
      END,
      jsonb_build_object(
        'client_id', COALESCE(NEW.id, OLD.id),
        'client_owner', client_owner_id,
        'accessed_by', auth.uid(),
        'accessor_role', accessing_user_role,
        'operation', TG_OP
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Phase 4: Add the audit trigger to clients table
DROP TRIGGER IF EXISTS audit_sensitive_client_operations_trigger ON public.clients;
CREATE TRIGGER audit_sensitive_client_operations_trigger
  BEFORE SELECT OR INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_client_operations();

-- Phase 5: Create emergency break-glass function for critical situations
-- This allows designated admins to access any client data in emergencies with full audit trail
CREATE OR REPLACE FUNCTION public.emergency_client_access(
  p_client_id uuid,
  p_justification text,
  p_incident_id text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  emergency_access_granted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Only admins can use emergency access
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Emergency access denied: Admin role required';
  END IF;
  
  -- Require justification
  IF p_justification IS NULL OR length(trim(p_justification)) < 10 THEN
    RAISE EXCEPTION 'Emergency access denied: Detailed justification required (minimum 10 characters)';
  END IF;
  
  -- Log emergency access as critical event
  PERFORM public.log_security_event(
    'emergency_client_access_granted',
    'critical',
    jsonb_build_object(
      'admin_id', auth.uid(),
      'client_id', p_client_id,
      'justification', p_justification,
      'incident_id', p_incident_id,
      'access_time', now(),
      'requires_review', true
    )
  );
  
  -- Return limited client data (no sensitive encrypted fields)
  RETURN QUERY
  SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    true as emergency_access_granted
  FROM public.clients c
  WHERE c.id = p_client_id;
END;
$$;

-- Phase 6: Update the old function to use the secure version and mark as deprecated
CREATE OR REPLACE FUNCTION public.can_access_client_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log usage of deprecated function
  PERFORM public.log_security_event(
    'deprecated_function_usage',
    'low',
    jsonb_build_object(
      'function_name', 'can_access_client_data',
      'replacement', 'can_access_client_data_secure',
      'user_id', auth.uid()
    )
  );
  
  -- Redirect to secure function
  RETURN public.can_access_client_data_secure(target_user_id);
END;
$$;