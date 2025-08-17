-- ========================================
-- COMPREHENSIVE CLIENT DATA SECURITY FIX - FINAL PART
-- ========================================

-- Phase 5: Create client data retention policy
INSERT INTO public.data_retention_policies (
  table_name,
  retention_period,
  auto_delete,
  compliance_rule
) VALUES (
  'clients',
  INTERVAL '7 years',
  false,
  'GDPR/CCPA - Customer data retention for business and legal requirements'
) ON CONFLICT (table_name) DO UPDATE SET
  retention_period = EXCLUDED.retention_period,
  compliance_rule = EXCLUDED.compliance_rule,
  updated_at = now();

-- Phase 6: Create comprehensive monitoring trigger
CREATE OR REPLACE FUNCTION public.monitor_client_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all operations on client data
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  )
  VALUES (
    auth.uid(),
    'client_data_' || lower(TG_OP),
    CASE TG_OP
      WHEN 'SELECT' THEN 'low'
      WHEN 'INSERT' THEN 'medium'
      WHEN 'UPDATE' THEN 'medium'
      WHEN 'DELETE' THEN 'high'
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'client_id', COALESCE(NEW.id, OLD.id),
      'timestamp', now(),
      'session_info', jsonb_build_object(
        'authenticated', auth.uid() IS NOT NULL,
        'user_id', auth.uid()
      )
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply monitoring trigger to clients table
DROP TRIGGER IF EXISTS monitor_client_access ON public.clients;
CREATE TRIGGER monitor_client_access
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.monitor_client_data_access();

-- Phase 7: Create emergency access function for critical situations
CREATE OR REPLACE FUNCTION public.emergency_client_access_with_approval(
  p_client_id uuid,
  p_emergency_reason text,
  p_approver_id uuid,
  p_incident_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
  approver_role app_role;
  emergency_data jsonb;
BEGIN
  -- Only admins and managers can use emergency access
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
  SELECT role INTO approver_role FROM public.user_roles WHERE user_id = p_approver_id;
  
  IF user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Emergency access requires admin or manager privileges';
  END IF;
  
  IF approver_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Emergency access requires approval from admin or manager';
  END IF;
  
  -- Log emergency access
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  )
  VALUES (
    auth.uid(),
    'emergency_client_access_granted',
    'critical',
    jsonb_build_object(
      'client_id', p_client_id,
      'emergency_reason', p_emergency_reason,
      'approver_id', p_approver_id,
      'incident_reference', p_incident_reference,
      'timestamp', now(),
      'requires_audit', true
    )
  );
  
  -- Get basic client data for emergency use
  SELECT jsonb_build_object(
    'id', c.id,
    'first_name', c.first_name,
    'last_name', c.last_name,
    'email', c.email,
    'phone', c.phone,
    'emergency_access_granted', true,
    'access_timestamp', now()
  ) INTO emergency_data
  FROM public.clients c
  WHERE c.id = p_client_id;
  
  RETURN emergency_data;
END;
$$;

-- Phase 8: Create data anonymization function for GDPR compliance
CREATE OR REPLACE FUNCTION public.anonymize_client_data(
  p_client_id uuid,
  p_reason text DEFAULT 'GDPR_REQUEST'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Only admins can anonymize data
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Data anonymization requires admin privileges';
  END IF;
  
  -- Log the anonymization
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  )
  VALUES (
    auth.uid(),
    'data_export',
    'high',
    jsonb_build_object(
      'action', 'anonymize_client_data',
      'client_id', p_client_id,
      'reason', p_reason,
      'timestamp', now(),
      'compliance_action', true
    )
  );
  
  -- Anonymize the client data
  UPDATE public.clients
  SET 
    first_name = 'ANONYMIZED',
    last_name = 'USER',
    email = 'anonymized_' || extract(epoch from now()) || '@deleted.com',
    phone = NULL,
    encrypted_ssn = NULL,
    encrypted_passport_number = NULL,
    encrypted_payment_info = NULL,
    notes = 'Data anonymized on ' || now() || ' - Reason: ' || p_reason,
    data_classification = 'anonymized'
  WHERE id = p_client_id;
  
  RETURN FOUND;
END;
$$;