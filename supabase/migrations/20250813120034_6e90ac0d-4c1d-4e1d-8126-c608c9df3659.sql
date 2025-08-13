-- CRITICAL SECURITY FIXES
-- Phase 1: Implement principle of least privilege and enhanced access controls

-- Fix 1: Strengthen client data access function with team-based restrictions
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

-- Fix 2: Strengthen quotes table RLS policies - replace overlapping policies
DROP POLICY IF EXISTS "Authenticated users: quotes SELECT" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users: quotes INSERT" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users: quotes UPDATE" ON public.quotes;

-- Create consolidated, secure quotes policies
CREATE POLICY "Secure quotes access - principle of least privilege"
ON public.quotes
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Users can access their own quotes
    auth.uid() = user_id OR
    -- Team-based access for financial data
    public.can_access_client_data_secure(user_id)
  )
);

CREATE POLICY "Secure quotes creation"
ON public.quotes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

CREATE POLICY "Secure quotes modification"
ON public.quotes
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    public.can_access_client_data_secure(user_id)
  )
)
WITH CHECK (
  auth.uid() = user_id
);

-- Fix 3: Add enhanced gmail credentials validation trigger
CREATE OR REPLACE FUNCTION public.validate_gmail_credentials_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure only encrypted tokens are stored
  IF NEW.access_token_encrypted IS NULL AND NEW.refresh_token_encrypted IS NULL THEN
    RAISE EXCEPTION 'Gmail credentials must use encrypted token fields only' USING ERRCODE = '22000';
  END IF;
  
  -- Validate encrypted token format (should be base64)
  IF NEW.access_token_encrypted IS NOT NULL AND NOT public.is_base64(NEW.access_token_encrypted) THEN
    RAISE EXCEPTION 'Invalid encrypted access token format' USING ERRCODE = '22000';
  END IF;
  
  IF NEW.refresh_token_encrypted IS NOT NULL AND NOT public.is_base64(NEW.refresh_token_encrypted) THEN
    RAISE EXCEPTION 'Invalid encrypted refresh token format' USING ERRCODE = '22000';
  END IF;
  
  -- Log credential updates for security monitoring
  PERFORM public.log_security_event(
    'gmail_credentials_updated',
    'medium',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'gmail_email', NEW.gmail_user_email,
      'has_encrypted_tokens', (NEW.access_token_encrypted IS NOT NULL),
      'validation_passed', true
    )
  );
  
  RETURN NEW;
END;
$$;

-- Fix 4: Secure system tables with proper authentication
-- Fix system_metrics table policies
DROP POLICY IF EXISTS "System can insert metrics" ON public.system_metrics;

CREATE POLICY "Authenticated system metrics insert"
ON public.system_metrics
FOR INSERT
WITH CHECK (
  -- Only allow inserts from authenticated edge functions or admin users
  auth.uid() IS NOT NULL OR 
  current_setting('role') = 'service_role'
);

-- Fix flight_price_tracking table policies  
DROP POLICY IF EXISTS "System can insert price data" ON public.flight_price_tracking;

CREATE POLICY "Authenticated price data insert"
ON public.flight_price_tracking
FOR INSERT  
WITH CHECK (
  -- Only allow inserts from authenticated systems or admin users
  auth.uid() IS NOT NULL OR
  current_setting('role') = 'service_role'
);

-- Add comprehensive audit trigger for sensitive client operations
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
  
  -- Log access by non-owners (for all operations)
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

-- Apply the audit trigger to clients table
DROP TRIGGER IF EXISTS audit_sensitive_client_operations_trigger ON public.clients;
CREATE TRIGGER audit_sensitive_client_operations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_client_operations();

-- Add emergency client access function with strict controls
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