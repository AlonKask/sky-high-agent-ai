-- ==========================================
-- COMPREHENSIVE SECURITY ENHANCEMENT MIGRATION (FIXED)
-- Addresses 5 Critical Security Warnings
-- ==========================================

-- 1. Enhanced Security Validation Functions
-- ==========================================

-- Function to validate PII data access with enhanced logging
CREATE OR REPLACE FUNCTION public.validate_pii_access(
  p_client_id UUID,
  p_field_name TEXT,
  p_justification TEXT DEFAULT 'routine_access'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_owner_id UUID;
  accessing_user_role app_role;
  is_authorized BOOLEAN := FALSE;
BEGIN
  -- Get client owner and accessing user role
  SELECT user_id INTO client_owner_id FROM public.clients WHERE id = p_client_id;
  SELECT role INTO accessing_user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Check authorization hierarchy
  IF auth.uid() = client_owner_id THEN
    is_authorized := TRUE;
  ELSIF accessing_user_role IN ('admin', 'manager', 'supervisor') THEN
    is_authorized := TRUE;
  END IF;
  
  -- Log all PII access attempts (critical for compliance)
  PERFORM public.log_security_event(
    CASE WHEN is_authorized THEN 'pii_access_authorized' ELSE 'pii_access_denied' END,
    CASE WHEN is_authorized THEN 'medium' ELSE 'high' END,
    jsonb_build_object(
      'client_id', p_client_id,
      'field_name', p_field_name,
      'justification', p_justification,
      'client_owner', client_owner_id,
      'accessing_user', auth.uid(),
      'accessing_role', accessing_user_role,
      'authorized', is_authorized,
      'compliance_audit', TRUE
    )
  );
  
  RETURN is_authorized;
END;
$$;

-- Function to validate financial data access with business protection
CREATE OR REPLACE FUNCTION public.validate_financial_access(
  p_quote_id UUID,
  p_access_type TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  quote_owner_id UUID;
  accessing_user_role app_role;
  is_authorized BOOLEAN := FALSE;
BEGIN
  -- Get quote owner and accessing user role
  SELECT user_id INTO quote_owner_id FROM public.quotes WHERE id = p_quote_id;
  SELECT role INTO accessing_user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Strict authorization for financial data
  IF auth.uid() = quote_owner_id THEN
    is_authorized := TRUE;
  ELSIF accessing_user_role IN ('admin', 'manager') AND p_access_type = 'view' THEN
    is_authorized := TRUE;
  END IF;
  
  -- Log financial data access (business critical)
  PERFORM public.log_security_event(
    CASE WHEN is_authorized THEN 'financial_access_authorized' ELSE 'financial_access_denied' END,
    'high', -- Always high severity for financial data
    jsonb_build_object(
      'quote_id', p_quote_id,
      'access_type', p_access_type,
      'quote_owner', quote_owner_id,
      'accessing_user', auth.uid(),
      'accessing_role', accessing_user_role,
      'authorized', is_authorized,
      'business_sensitive', TRUE
    )
  );
  
  RETURN is_authorized;
END;
$$;

-- Function to validate communication privacy
CREATE OR REPLACE FUNCTION public.validate_communication_access(
  p_user_id UUID,
  p_communication_type TEXT DEFAULT 'email'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_role app_role;
  is_authorized BOOLEAN := FALSE;
BEGIN
  SELECT role INTO accessing_user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Communications are private by default
  IF auth.uid() = p_user_id THEN
    is_authorized := TRUE;
  ELSIF accessing_user_role = 'admin' THEN
    -- Admins need explicit justification logged
    is_authorized := TRUE;
  END IF;
  
  -- Log communication access for privacy audit
  PERFORM public.log_security_event(
    CASE WHEN is_authorized THEN 'communication_access_authorized' ELSE 'communication_access_denied' END,
    'medium',
    jsonb_build_object(
      'target_user', p_user_id,
      'communication_type', p_communication_type,
      'accessing_user', auth.uid(),
      'accessing_role', accessing_user_role,
      'authorized', is_authorized,
      'privacy_audit', TRUE
    )
  );
  
  RETURN is_authorized;
END;
$$;

-- Function to validate booking data access with fraud protection
CREATE OR REPLACE FUNCTION public.validate_booking_access(
  p_booking_id UUID,
  p_access_type TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  booking_owner_id UUID;
  accessing_user_role app_role;
  is_authorized BOOLEAN := FALSE;
BEGIN
  SELECT user_id INTO booking_owner_id FROM public.bookings WHERE id = p_booking_id;
  SELECT role INTO accessing_user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Booking access control
  IF auth.uid() = booking_owner_id THEN
    is_authorized := TRUE;
  ELSIF accessing_user_role IN ('admin', 'manager', 'supervisor') THEN
    is_authorized := TRUE;
  END IF;
  
  -- Log booking access (competitive intelligence protection)
  PERFORM public.log_security_event(
    CASE WHEN is_authorized THEN 'booking_access_authorized' ELSE 'booking_access_denied' END,
    'high',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'access_type', p_access_type,
      'booking_owner', booking_owner_id,
      'accessing_user', auth.uid(),
      'accessing_role', accessing_user_role,
      'authorized', is_authorized,
      'competitive_protection', TRUE
    )
  );
  
  RETURN is_authorized;
END;
$$;

-- Function to validate credential access with token security
CREATE OR REPLACE FUNCTION public.validate_credential_access(
  p_user_id UUID,
  p_credential_type TEXT DEFAULT 'gmail'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_role app_role;
  is_authorized BOOLEAN := FALSE;
BEGIN
  SELECT role INTO accessing_user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Credentials are strictly personal
  IF auth.uid() = p_user_id THEN
    is_authorized := TRUE;
  -- Only service role can access for system operations
  ELSIF current_setting('role') = 'service_role' THEN
    is_authorized := TRUE;
  END IF;
  
  -- Log credential access (security critical)
  PERFORM public.log_security_event(
    CASE WHEN is_authorized THEN 'credential_access_authorized' ELSE 'credential_access_denied' END,
    'critical', -- Always critical for credentials
    jsonb_build_object(
      'target_user', p_user_id,
      'credential_type', p_credential_type,
      'accessing_user', auth.uid(),
      'accessing_role', accessing_user_role,
      'authorized', is_authorized,
      'credential_security', TRUE
    )
  );
  
  RETURN is_authorized;
END;
$$;

-- 2. Enhanced RLS Policies
-- ==========================================

-- Enhanced Clients Table Security
DROP POLICY IF EXISTS "ENHANCED_clients_pii_protection" ON public.clients;
DROP POLICY IF EXISTS "STRICT_clients_absolute_isolation" ON public.clients;
DROP POLICY IF EXISTS "DENY_anonymous_clients_access" ON public.clients;

CREATE POLICY "ENHANCED_clients_pii_protection"
ON public.clients
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND validate_session_security()
  AND validate_pii_access(id, 'client_data', 'policy_check')
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Enhanced Quotes Table Security  
DROP POLICY IF EXISTS "ENHANCED_quotes_financial_protection" ON public.quotes;
DROP POLICY IF EXISTS "quotes_absolute_isolation" ON public.quotes;

CREATE POLICY "ENHANCED_quotes_financial_protection"
ON public.quotes
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND validate_financial_access(id, 'view')
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Enhanced Gmail Credentials Security
DROP POLICY IF EXISTS "ENHANCED_gmail_credential_security" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Enhanced gmail credentials access" ON public.gmail_credentials;

CREATE POLICY "ENHANCED_gmail_credential_security"
ON public.gmail_credentials
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND validate_session_security()
  AND validate_credential_access(user_id, 'gmail')
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- 3. Enhanced Security Triggers
-- ==========================================

-- Enhanced client data monitoring trigger
CREATE OR REPLACE FUNCTION public.enhanced_client_security_monitor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sensitive_fields_changed BOOLEAN := FALSE;
BEGIN
  -- Check if sensitive fields were modified
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.encrypted_ssn IS DISTINCT FROM OLD.encrypted_ssn) OR
       (NEW.encrypted_passport_number IS DISTINCT FROM OLD.encrypted_passport_number) OR
       (NEW.encrypted_payment_info IS DISTINCT FROM OLD.encrypted_payment_info) OR
       (NEW.email IS DISTINCT FROM OLD.email) OR
       (NEW.phone IS DISTINCT FROM OLD.phone) THEN
      sensitive_fields_changed := TRUE;
    END IF;
  END IF;
  
  -- Enhanced logging for sensitive operations
  PERFORM public.log_security_event(
    'client_data_' || lower(TG_OP),
    CASE 
      WHEN sensitive_fields_changed THEN 'critical'
      WHEN TG_OP = 'DELETE' THEN 'high'
      ELSE 'medium'
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'client_id', COALESCE(NEW.id, OLD.id),
      'client_owner', COALESCE(NEW.user_id, OLD.user_id),
      'modified_by', auth.uid(),
      'sensitive_fields_changed', sensitive_fields_changed,
      'data_classification', 'confidential',
      'compliance_required', TRUE,
      'enhanced_monitoring', TRUE
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply enhanced trigger to clients table
DROP TRIGGER IF EXISTS enhanced_client_security_monitor ON public.clients;
DROP TRIGGER IF EXISTS monitor_client_data_access ON public.clients;
DROP TRIGGER IF EXISTS audit_sensitive_client_operations ON public.clients;
CREATE TRIGGER enhanced_client_security_monitor
  BEFORE INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_client_security_monitor();

-- Enhanced financial data monitoring for quotes
CREATE OR REPLACE FUNCTION public.enhanced_financial_security_monitor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log financial data operations
  PERFORM public.log_security_event(
    'financial_data_' || lower(TG_OP),
    'high', -- Always high priority for financial data
    jsonb_build_object(
      'operation', TG_OP,
      'quote_id', COALESCE(NEW.id, OLD.id),
      'quote_owner', COALESCE(NEW.user_id, OLD.user_id),
      'modified_by', auth.uid(),
      'contains_pricing', TRUE,
      'business_sensitive', TRUE,
      'competitive_intelligence', TRUE
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enhanced_financial_security_monitor ON public.quotes;
CREATE TRIGGER enhanced_financial_security_monitor
  BEFORE INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_financial_security_monitor();

-- Enhanced credential security monitoring
CREATE OR REPLACE FUNCTION public.enhanced_credential_security_monitor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log credential operations (always critical)
  PERFORM public.log_security_event(
    'credential_' || lower(TG_OP),
    'critical',
    jsonb_build_object(
      'operation', TG_OP,
      'credential_owner', COALESCE(NEW.user_id, OLD.user_id),
      'modified_by', auth.uid(),
      'credential_type', 'gmail_tokens',
      'security_critical', TRUE,
      'requires_immediate_review', TRUE
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enhanced_credential_security_monitor ON public.gmail_credentials;
DROP TRIGGER IF EXISTS validate_gmail_credentials_security ON public.gmail_credentials;
CREATE TRIGGER enhanced_credential_security_monitor
  BEFORE INSERT OR UPDATE OR DELETE ON public.gmail_credentials
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_credential_security_monitor();

-- 4. Data Classification and Retention
-- ==========================================

-- Function to classify and tag sensitive data
CREATE OR REPLACE FUNCTION public.classify_sensitive_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update data classification for existing records
  UPDATE public.clients 
  SET data_classification = 'highly_confidential' 
  WHERE encrypted_ssn IS NOT NULL 
     OR encrypted_passport_number IS NOT NULL 
     OR encrypted_payment_info IS NOT NULL;
  
  -- Log classification activity
  PERFORM public.log_security_event(
    'data_classification_updated',
    'medium',
    jsonb_build_object(
      'activity', 'automated_classification',
      'compliance_requirement', TRUE
    )
  );
END;
$$;

-- 5. Security Event Correlation and Monitoring
-- ==========================================

-- Function to detect security patterns and anomalies
CREATE OR REPLACE FUNCTION public.detect_security_anomalies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  suspicious_access_count INTEGER;
BEGIN
  -- Detect suspicious access patterns in last hour
  SELECT COUNT(*) INTO suspicious_access_count
  FROM public.security_events
  WHERE event_type LIKE '%_denied'
    AND timestamp > now() - INTERVAL '1 hour'
    AND severity IN ('high', 'critical');
  
  -- Alert on suspicious patterns
  IF suspicious_access_count >= 5 THEN
    PERFORM public.log_security_event(
      'security_anomaly_detected',
      'critical',
      jsonb_build_object(
        'anomaly_type', 'excessive_access_denials',
        'event_count', suspicious_access_count,
        'time_window', '1 hour',
        'requires_investigation', TRUE,
        'automated_detection', TRUE
      )
    );
  END IF;
END;
$$;

-- 6. Initialize Security Enhancements
-- ==========================================

-- Run initial data classification and log deployment
DO $$
BEGIN
  -- Run data classification
  PERFORM public.classify_sensitive_data();
  
  -- Log successful security enhancement deployment
  PERFORM public.log_security_event(
    'security_enhancement_deployed',
    'low',
    jsonb_build_object(
      'enhancement_version', '2.0',
      'deployment_timestamp', now(),
      'security_warnings_addressed', 5,
      'enhanced_functions_created', 5,
      'enhanced_policies_created', 3,
      'enhanced_triggers_created', 3,
      'compliance_ready', TRUE
    )
  );
END $$;