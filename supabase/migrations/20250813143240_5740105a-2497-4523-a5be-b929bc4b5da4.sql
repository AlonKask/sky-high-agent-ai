-- Critical Security Fix for Clients Table
-- Addresses: Customer Personal Information Could Be Stolen by Hackers
-- ERROR Level: Must implement ultra-strict access controls for sensitive customer data

-- Step 1: Drop dependent policies first
DROP POLICY IF EXISTS "ZERO_TRUST_clients_select" ON public.clients;
DROP POLICY IF EXISTS "ZERO_TRUST_clients_update" ON public.clients;
DROP POLICY IF EXISTS "ZERO_TRUST_clients_insert" ON public.clients;
DROP POLICY IF EXISTS "ZERO_TRUST_clients_delete" ON public.clients;

-- Step 2: Now we can safely drop the function
DROP FUNCTION IF EXISTS public.can_access_client_data_ultra_strict(UUID, UUID);

-- Step 3: Create ultra-secure access control function
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
  is_team_member BOOLEAN := false;
  client_owner_id UUID;
BEGIN
  -- CRITICAL: Deny all unauthenticated access immediately
  IF accessing_user_id IS NULL THEN
    PERFORM public.log_security_event(
      'unauthorized_client_access_attempt',
      'critical',
      jsonb_build_object(
        'reason', 'unauthenticated_access',
        'target_user_id', target_user_id,
        'client_id', client_id,
        'timestamp', now()
      )
    );
    RETURN false;
  END IF;

  -- Validate input parameters
  IF target_user_id IS NULL OR client_id IS NULL THEN
    PERFORM public.log_security_event(
      'unauthorized_client_access_attempt',
      'high',
      jsonb_build_object(
        'reason', 'invalid_parameters',
        'target_user_id', target_user_id,
        'client_id', client_id
      )
    );
    RETURN false;
  END IF;

  -- Verify client exists and get owner
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

  -- CRITICAL: Verify data integrity - client owner must match target user
  IF client_owner_id != target_user_id THEN
    PERFORM public.log_security_event(
      'unauthorized_client_access_attempt',
      'critical',
      jsonb_build_object(
        'reason', 'data_integrity_violation',
        'client_id', client_id,
        'client_owner', client_owner_id,
        'target_user', target_user_id,
        'accessing_user', accessing_user_id
      )
    );
    RETURN false;
  END IF;

  -- Allow users to access their own client data only
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;

  -- Get accessing user's role for elevated permissions
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;

  -- STRICT TEAM-BASED ACCESS: Only direct team relationships allowed
  IF user_role IN ('manager', 'supervisor') THEN
    -- Check if target user is in accessing user's direct team
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_team_member;
    
    IF is_team_member THEN
      -- Log high-severity access for team oversight
      PERFORM public.log_security_event(
        CASE WHEN user_role = 'manager' THEN 'manager_team_client_access'
             ELSE 'supervisor_team_client_access' END,
        'high',
        jsonb_build_object(
          'accessing_user_id', accessing_user_id,
          'accessing_role', user_role,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'justification', 'team_oversight',
          'requires_business_justification', true
        )
      );
      RETURN true;
    END IF;
  END IF;

  -- ADMIN ACCESS: Critical logging required
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_client_data_access',
      'critical',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id,
        'access_reason', 'admin_override',
        'requires_immediate_justification', true,
        'compliance_flag', true,
        'timestamp', now()
      )
    );
    RETURN true;
  END IF;

  -- DENY ALL OTHER ACCESS
  PERFORM public.log_security_event(
    'unauthorized_client_access_attempt',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'client_id', client_id,
      'user_role', COALESCE(user_role::text, 'no_role'),
      'denial_reason', 'insufficient_privileges',
      'security_violation', true
    )
  );
  
  RETURN false;
END;
$$;

-- Step 4: Create maximum security RLS policies
-- POLICY 1: SELECT - Ultra-strict access control with comprehensive logging
CREATE POLICY "ULTRA_SECURE_clients_select" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (
  can_access_client_data_ultra_strict(user_id, id)
);

-- POLICY 2: INSERT - Strict validation with required fields
CREATE POLICY "ULTRA_SECURE_clients_insert" 
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

-- POLICY 3: UPDATE - Owner-only with strict validation
CREATE POLICY "ULTRA_SECURE_clients_update" 
ON public.clients 
FOR UPDATE 
TO authenticated
USING (
  can_access_client_data_ultra_strict(user_id, id)
)
WITH CHECK (
  auth.uid() = user_id  -- Only owner can modify
  AND data_classification IN ('confidential', 'restricted', 'secret')
);

-- POLICY 4: DELETE - Owner-only deletion
CREATE POLICY "ULTRA_SECURE_clients_delete" 
ON public.clients 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Step 5: Add comprehensive security event types to constraint
ALTER TABLE public.security_events 
DROP CONSTRAINT IF EXISTS security_events_event_type_check;

ALTER TABLE public.security_events 
ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type IN (
  'login_attempt', 'login_success', 'login_failure', 'logout', 
  'password_change', 'email_change', 'mfa_enabled', 'mfa_disabled',
  'suspicious_activity', 'data_access', 'unauthorized_access', 'admin_action',
  'token_refresh', 'session_timeout', 'account_locked', 'account_unlocked',
  'data_export', 'data_deletion', 'permission_escalation', 'security_breach',
  'sensitive_data_access', 'sensitive_data_modified', 'unauthorized_access_attempt',
  'client_sensitive_modified', 'cross_user_client_access', 'emergency_client_access_granted',
  'admin_client_data_access', 'manager_team_client_access', 'supervisor_team_client_access',
  'unauthorized_client_access_attempt', 'audit_data_accessed', 'option_review_token_generated',
  'option_token_accessed', 'option_token_access_denied', 'invalid_option_token_attempt',
  'gmail_credentials_updated', 'gmail_webhook_received', 'invalid_oauth_state_token',
  'anonymous_profile_access_blocked', 'cross_user_profile_access_blocked',
  'sensitive_table_access', 'rate_limit_exceeded', 'invalid_request_signature',
  'webhook_verification_failed', 'encryption_operation_failed', 'decryption_operation_failed',
  'token_storage_blocked', 'client_data_operation'
));

-- Step 6: Comprehensive audit logging for all client operations
CREATE OR REPLACE FUNCTION public.audit_all_client_operations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  operation_details JSONB;
  severity_level TEXT;
  changed_sensitive_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Determine severity based on operation type and data sensitivity
  severity_level := CASE 
    WHEN TG_OP = 'DELETE' THEN 'critical'
    WHEN TG_OP = 'INSERT' THEN 'medium'
    WHEN TG_OP = 'UPDATE' THEN 'medium'
    ELSE 'low'
  END;

  -- Check for sensitive field changes in updates
  IF TG_OP = 'UPDATE' THEN
    IF NEW.encrypted_ssn IS DISTINCT FROM OLD.encrypted_ssn THEN
      changed_sensitive_fields := array_append(changed_sensitive_fields, 'encrypted_ssn');
      severity_level := 'critical';
    END IF;
    IF NEW.encrypted_passport_number IS DISTINCT FROM OLD.encrypted_passport_number THEN
      changed_sensitive_fields := array_append(changed_sensitive_fields, 'encrypted_passport_number');
      severity_level := 'critical';
    END IF;
    IF NEW.encrypted_payment_info IS DISTINCT FROM OLD.encrypted_payment_info THEN
      changed_sensitive_fields := array_append(changed_sensitive_fields, 'encrypted_payment_info');
      severity_level := 'critical';
    END IF;
  END IF;

  -- Build comprehensive operation details
  operation_details := jsonb_build_object(
    'operation', TG_OP,
    'client_id', COALESCE(NEW.id, OLD.id),
    'client_owner', COALESCE(NEW.user_id, OLD.user_id),
    'performed_by', auth.uid(),
    'table_name', TG_TABLE_NAME,
    'timestamp', now(),
    'sensitive_fields_changed', changed_sensitive_fields,
    'data_classification', COALESCE(NEW.data_classification, OLD.data_classification)
  );

  -- Log the security event
  PERFORM public.log_security_event(
    'client_data_operation',
    severity_level,
    operation_details
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply the comprehensive audit trigger
DROP TRIGGER IF EXISTS audit_all_client_operations_trigger ON public.clients;
CREATE TRIGGER audit_all_client_operations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_all_client_operations();