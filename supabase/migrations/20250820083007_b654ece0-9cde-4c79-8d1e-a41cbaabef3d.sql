-- PHASE 2: Fix Remaining Critical Security Vulnerabilities
-- Remove role-based access loopholes and implement strict user isolation

-- Drop the consolidated policies that still allow cross-user access
DROP POLICY IF EXISTS "clients_consolidated_security" ON public.clients;
DROP POLICY IF EXISTS "quotes_financial_security" ON public.quotes;

-- Create ultra-strict user-isolation policies
-- CLIENTS: Absolute user isolation - no exceptions
CREATE POLICY "clients_absolute_isolation"
ON public.clients
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- QUOTES: Complete financial data isolation
CREATE POLICY "quotes_absolute_isolation"
ON public.quotes
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Create admin-only override function for emergency access with heavy logging
CREATE OR REPLACE FUNCTION public.emergency_admin_access(
  table_name text,
  record_id uuid,
  business_justification text,
  supervisor_approval_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_role app_role;
BEGIN
  -- Verify admin role
  SELECT role INTO admin_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  IF admin_role != 'admin' THEN
    -- Log unauthorized attempt
    PERFORM public.log_security_event(
      'unauthorized_emergency_access_attempt',
      'critical',
      jsonb_build_object(
        'attempted_by', auth.uid(),
        'table_name', table_name,
        'record_id', record_id,
        'justification', business_justification,
        'approval_code_provided', supervisor_approval_code IS NOT NULL
      )
    );
    RETURN false;
  END IF;
  
  -- Require detailed justification (minimum 50 characters)
  IF business_justification IS NULL OR length(trim(business_justification)) < 50 THEN
    RETURN false;
  END IF;
  
  -- Require supervisor approval code (in production, this would validate against a secure system)
  IF supervisor_approval_code IS NULL OR length(trim(supervisor_approval_code)) < 10 THEN
    RETURN false;
  END IF;
  
  -- Log the emergency access as critical security event
  PERFORM public.log_security_event(
    'emergency_admin_override_used',
    'critical',
    jsonb_build_object(
      'admin_id', auth.uid(),
      'table_name', table_name,
      'record_id', record_id,
      'business_justification', business_justification,
      'supervisor_approval_code', supervisor_approval_code,
      'requires_compliance_review', true,
      'timestamp', now(),
      'ip_context', current_setting('request.jwt.claims', true)::jsonb->>'ip',
      'emergency_breach_logged', true
    )
  );
  
  -- Also log to critical audit trail
  INSERT INTO public.critical_audit_trail (
    user_id,
    operation_type,
    table_name,
    record_id,
    risk_assessment,
    business_justification,
    integrity_hash
  ) VALUES (
    auth.uid(),
    'EMERGENCY_ADMIN_ACCESS',
    table_name,
    record_id,
    'MAXIMUM',
    'EMERGENCY OVERRIDE: ' || business_justification || ' | Approval: ' || supervisor_approval_code,
    encode(digest('emergency_' || auth.uid()::text || '_' || now()::text || '_' || table_name || '_' || record_id::text, 'sha256'), 'hex')
  );
  
  RETURN true;
END;
$$;