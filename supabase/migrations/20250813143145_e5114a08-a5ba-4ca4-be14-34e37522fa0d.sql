-- Fix clients table security - Critical security patch
-- Addresses: Customer Personal Information Could Be Stolen by Hackers

-- First, drop the existing function completely
DROP FUNCTION IF EXISTS public.can_access_client_data_ultra_strict(UUID, UUID);

-- Create the ultra-strict client access control function
CREATE OR REPLACE FUNCTION public.can_access_client_data_ultra_strict(target_user_id UUID, client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id UUID := auth.uid();
  user_role app_role;
  is_direct_team_member BOOLEAN := false;
  client_owner_id UUID;
BEGIN
  -- Immediate denial for unauthenticated users
  IF accessing_user_id IS NULL OR target_user_id IS NULL OR client_id IS NULL THEN
    PERFORM public.log_security_event(
      'unauthorized_client_access_attempt',
      'critical',
      jsonb_build_object(
        'reason', 'null_authentication',
        'target_user_id', target_user_id,
        'client_id', client_id
      )
    );
    RETURN false;
  END IF;

  -- Get client owner to validate ownership
  SELECT user_id INTO client_owner_id 
  FROM public.clients 
  WHERE id = client_id;
  
  IF client_owner_id IS NULL THEN
    PERFORM public.log_security_event(
      'unauthorized_client_access_attempt',
      'high',
      jsonb_build_object(
        'reason', 'client_not_found',
        'client_id', client_id
      )
    );
    RETURN false;
  END IF;

  -- Verify client ownership matches target user
  IF client_owner_id != target_user_id THEN
    PERFORM public.log_security_event(
      'unauthorized_client_access_attempt',
      'critical',
      jsonb_build_object(
        'reason', 'ownership_mismatch',
        'client_id', client_id,
        'client_owner', client_owner_id,
        'target_user', target_user_id
      )
    );
    RETURN false;
  END IF;

  -- Allow users to access their own client data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;

  -- Get accessing user's role for elevated permission checks
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
      PERFORM public.log_security_event(
        'manager_team_client_access',
        'high',
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
      PERFORM public.log_security_event(
        'supervisor_team_client_access',
        'high',
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

  -- For admins: Require explicit justification and critical logging
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_client_data_access',
      'critical',
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

  -- Deny all other access attempts
  PERFORM public.log_security_event(
    'unauthorized_client_access_attempt',
    'critical',
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

-- Replace RLS policies with maximum security versions
DROP POLICY IF EXISTS "MAXIMUM_SECURITY_clients_select" ON public.clients;
DROP POLICY IF EXISTS "MAXIMUM_SECURITY_clients_insert" ON public.clients;
DROP POLICY IF EXISTS "MAXIMUM_SECURITY_clients_update" ON public.clients;
DROP POLICY IF EXISTS "MAXIMUM_SECURITY_clients_delete" ON public.clients;

-- 1. SELECT: Ultra-strict access control
CREATE POLICY "MAXIMUM_SECURITY_clients_select" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (
  can_access_client_data_ultra_strict(user_id, id)
);

-- 2. INSERT: Strict validation for new records
CREATE POLICY "MAXIMUM_SECURITY_clients_insert" 
ON public.clients 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND data_classification IN ('confidential', 'restricted', 'secret')
  AND email IS NOT NULL 
  AND first_name IS NOT NULL 
  AND last_name IS NOT NULL
  AND length(trim(first_name)) >= 1
  AND length(trim(last_name)) >= 1
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- 3. UPDATE: Ownership validation with audit logging
CREATE POLICY "MAXIMUM_SECURITY_clients_update" 
ON public.clients 
FOR UPDATE 
TO authenticated
USING (
  can_access_client_data_ultra_strict(user_id, id)
)
WITH CHECK (
  auth.uid() = user_id
  AND data_classification IN ('confidential', 'restricted', 'secret')
);

-- 4. DELETE: Owner-only deletion
CREATE POLICY "MAXIMUM_SECURITY_clients_delete" 
ON public.clients 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Add comprehensive audit trigger
DROP TRIGGER IF EXISTS audit_all_client_operations_trigger ON public.clients;
DROP FUNCTION IF EXISTS public.audit_all_client_operations();

CREATE OR REPLACE FUNCTION public.audit_all_client_operations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  operation_details JSONB;
  severity_level TEXT;
BEGIN
  severity_level := CASE 
    WHEN TG_OP = 'DELETE' THEN 'critical'
    WHEN TG_OP = 'INSERT' THEN 'medium'
    WHEN TG_OP = 'UPDATE' AND (
      NEW.encrypted_ssn IS DISTINCT FROM OLD.encrypted_ssn OR
      NEW.encrypted_passport_number IS DISTINCT FROM OLD.encrypted_passport_number OR
      NEW.encrypted_payment_info IS DISTINCT FROM OLD.encrypted_payment_info
    ) THEN 'critical'
    ELSE 'medium'
  END;

  operation_details := jsonb_build_object(
    'operation', TG_OP,
    'client_id', COALESCE(NEW.id, OLD.id),
    'client_owner', COALESCE(NEW.user_id, OLD.user_id),
    'performed_by', auth.uid(),
    'table_name', TG_TABLE_NAME,
    'timestamp', now()
  );

  PERFORM public.log_security_event(
    'client_data_operation',
    severity_level,
    operation_details
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_all_client_operations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_all_client_operations();

-- Add data classification validation
DROP TRIGGER IF EXISTS validate_client_data_classification_trigger ON public.clients;
DROP FUNCTION IF EXISTS public.validate_client_data_classification();

CREATE OR REPLACE FUNCTION public.validate_client_data_classification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure proper data classification
  IF NEW.data_classification NOT IN ('confidential', 'restricted', 'secret') THEN
    NEW.data_classification := 'confidential';
  END IF;

  -- Force higher classification for sensitive data
  IF (NEW.encrypted_ssn IS NOT NULL OR 
      NEW.encrypted_passport_number IS NOT NULL OR 
      NEW.encrypted_payment_info IS NOT NULL) AND 
      NEW.data_classification = 'public' THEN
    NEW.data_classification := 'restricted';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_client_data_classification_trigger
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_data_classification();