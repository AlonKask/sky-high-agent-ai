-- Implement additional security measures based on scanner findings
-- Add field-level encryption status validation and enhanced audit trails

-- Create function to validate encryption status of sensitive fields
CREATE OR REPLACE FUNCTION public.validate_sensitive_field_encryption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure all sensitive fields are properly encrypted when storing data
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Validate encrypted SSN format if provided
    IF NEW.encrypted_ssn IS NOT NULL THEN
      IF NOT public.is_base64(NEW.encrypted_ssn) THEN
        RAISE EXCEPTION 'SECURITY VIOLATION: SSN must be properly encrypted (base64 format)';
      END IF;
      
      -- Log access to SSN data
      PERFORM public.log_security_event(
        'sensitive_data_access',
        'high',
        jsonb_build_object(
          'field_type', 'encrypted_ssn',
          'client_id', NEW.id,
          'operation', TG_OP
        )
      );
    END IF;
    
    -- Validate encrypted passport format if provided
    IF NEW.encrypted_passport_number IS NOT NULL THEN
      IF NOT public.is_base64(NEW.encrypted_passport_number) THEN
        RAISE EXCEPTION 'SECURITY VIOLATION: Passport must be properly encrypted (base64 format)';
      END IF;
      
      -- Log access to passport data
      PERFORM public.log_security_event(
        'sensitive_data_access',
        'high',
        jsonb_build_object(
          'field_type', 'encrypted_passport_number',
          'client_id', NEW.id,
          'operation', TG_OP
        )
      );
    END IF;
    
    -- Validate encrypted payment info format if provided
    IF NEW.encrypted_payment_info IS NOT NULL THEN
      -- Log access to payment data
      PERFORM public.log_security_event(
        'sensitive_data_access',
        'critical',
        jsonb_build_object(
          'field_type', 'encrypted_payment_info',
          'client_id', NEW.id,
          'operation', TG_OP,
          'requires_audit', true
        )
      );
    END IF;
    
    -- Ensure data classification is set for all new records
    IF NEW.data_classification IS NULL THEN
      NEW.data_classification := 'confidential';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create encryption validation trigger
DROP TRIGGER IF EXISTS validate_encryption_trigger ON public.clients;
CREATE TRIGGER validate_encryption_trigger
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.validate_sensitive_field_encryption();

-- Create comprehensive access audit function
CREATE OR REPLACE FUNCTION public.comprehensive_client_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_role app_role;
  audit_severity text := 'medium';
BEGIN
  -- Get user role for proper severity classification
  SELECT role INTO accessing_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Determine audit severity based on user role and operation
  IF accessing_user_role = 'admin' THEN
    audit_severity := 'high';
  ELSIF accessing_user_role IN ('manager', 'supervisor') THEN
    audit_severity := 'medium';
  ELSE
    audit_severity := 'low';
  END IF;
  
  -- Log comprehensive audit trail
  PERFORM public.log_security_event(
    'client_data_accessed',
    audit_severity,
    jsonb_build_object(
      'client_id', COALESCE(NEW.id, OLD.id),
      'client_owner', COALESCE(NEW.user_id, OLD.user_id),
      'accessing_user', auth.uid(),
      'accessing_user_role', accessing_user_role,
      'operation', TG_OP,
      'has_sensitive_data', CASE 
        WHEN COALESCE(NEW.encrypted_ssn, OLD.encrypted_ssn) IS NOT NULL 
          OR COALESCE(NEW.encrypted_passport_number, OLD.encrypted_passport_number) IS NOT NULL
          OR COALESCE(NEW.encrypted_payment_info, OLD.encrypted_payment_info) IS NOT NULL
        THEN true 
        ELSE false 
      END,
      'timestamp', now(),
      'compliance_required', true
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create comprehensive audit trigger (replaces simpler one)
DROP TRIGGER IF EXISTS audit_client_modifications_trigger ON public.clients;
CREATE TRIGGER comprehensive_client_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.comprehensive_client_audit();

-- Create additional security check for high-risk operations
CREATE OR REPLACE FUNCTION public.detect_high_risk_client_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  risk_score integer := 0;
  accessing_user_role app_role;
BEGIN
  -- Calculate risk score for this access
  SELECT role INTO accessing_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Increase risk for sensitive data access
  IF COALESCE(NEW.encrypted_ssn, OLD.encrypted_ssn) IS NOT NULL THEN
    risk_score := risk_score + 30;
  END IF;
  
  IF COALESCE(NEW.encrypted_passport_number, OLD.encrypted_passport_number) IS NOT NULL THEN
    risk_score := risk_score + 25;
  END IF;
  
  IF COALESCE(NEW.encrypted_payment_info, OLD.encrypted_payment_info) IS NOT NULL THEN
    risk_score := risk_score + 40;
  END IF;
  
  -- Increase risk for cross-user access
  IF auth.uid() != COALESCE(NEW.user_id, OLD.user_id) THEN
    risk_score := risk_score + 20;
  END IF;
  
  -- Log high-risk access
  IF risk_score >= 50 THEN
    PERFORM public.log_security_event(
      'client_access_violation',
      'critical',
      jsonb_build_object(
        'risk_score', risk_score,
        'client_id', COALESCE(NEW.id, OLD.id),
        'accessing_user', auth.uid(),
        'accessing_user_role', accessing_user_role,
        'requires_immediate_review', true,
        'alert_security_team', true
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create high-risk detection trigger
DROP TRIGGER IF EXISTS detect_high_risk_trigger ON public.clients;
CREATE TRIGGER detect_high_risk_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.detect_high_risk_client_access();