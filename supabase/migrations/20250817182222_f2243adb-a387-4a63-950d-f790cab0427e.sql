-- COMPREHENSIVE SECURITY HARDENING PLAN - PHASE 1 (FIXED)
-- Zero-Trust Client Data Access & Enhanced Encryption

-- Create advanced security monitoring table
CREATE TABLE IF NOT EXISTS public.security_monitoring (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  client_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'client_data_access', 'sensitive_field_access', 'bulk_access_attempt',
    'encryption_operation', 'key_rotation', 'emergency_access',
    'anomaly_detected', 'policy_violation', 'data_export'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_fingerprint TEXT,
  requires_investigation BOOLEAN DEFAULT FALSE,
  investigated_by UUID,
  investigation_notes TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE
);

-- Create client encryption keys table for per-client encryption
CREATE TABLE IF NOT EXISTS public.client_encryption_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  salt BYTEA NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  rotation_due TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'expired', 'revoked')),
  UNIQUE(client_id, key_version)
);

-- Create emergency access log
CREATE TABLE IF NOT EXISTS public.emergency_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  accessing_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_client_id UUID NOT NULL,
  justification TEXT NOT NULL,
  authorized_by UUID REFERENCES auth.users(id),
  access_granted BOOLEAN DEFAULT FALSE,
  emergency_type TEXT NOT NULL CHECK (emergency_type IN (
    'medical_emergency', 'legal_requirement', 'fraud_investigation',
    'system_compromise', 'compliance_audit', 'other'
  )),
  access_duration INTERVAL DEFAULT INTERVAL '1 hour',
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced security monitoring logging function
CREATE OR REPLACE FUNCTION public.log_security_monitoring(
  p_user_id UUID,
  p_client_id UUID,
  p_event_type TEXT,
  p_severity TEXT DEFAULT 'medium',
  p_details JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_monitoring (
    user_id,
    client_id,
    event_type,
    severity,
    details,
    ip_address,
    user_agent,
    requires_investigation
  ) VALUES (
    p_user_id,
    p_client_id,
    p_event_type,
    p_severity,
    p_details || jsonb_build_object(
      'timestamp', NOW(),
      'session_id', current_setting('app.session_id', true)
    ),
    COALESCE(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', '127.0.0.1')::inet,
    current_setting('request.headers', true)::jsonb->>'user-agent',
    p_severity IN ('high', 'critical')
  );
END;
$$;

-- Enhanced security function for zero-trust client access
CREATE OR REPLACE FUNCTION public.zero_trust_client_access(
  p_client_id UUID,
  p_operation TEXT,
  p_justification TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_owner_id UUID;
  accessing_user_id UUID := auth.uid();
  user_role app_role;
  access_granted BOOLEAN := FALSE;
  emergency_access BOOLEAN := FALSE;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    PERFORM public.log_security_monitoring(
      accessing_user_id,
      p_client_id,
      'policy_violation',
      'critical',
      jsonb_build_object(
        'reason', 'unauthenticated_access_attempt',
        'operation', p_operation,
        'client_id', p_client_id
      )
    );
    RETURN FALSE;
  END IF;

  -- Get client owner and accessing user role
  SELECT user_id INTO client_owner_id FROM public.clients WHERE id = p_client_id;
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;

  -- Zero-Trust Rule 1: Owner access (always allowed)
  IF accessing_user_id = client_owner_id THEN
    access_granted := TRUE;
  -- Zero-Trust Rule 2: Emergency access (requires justification)
  ELSIF user_role IN ('admin', 'supervisor', 'manager') AND p_justification IS NOT NULL THEN
    -- Check for active emergency access
    SELECT EXISTS(
      SELECT 1 FROM public.emergency_access_log 
      WHERE accessing_user_id = accessing_user_id
      AND target_client_id = p_client_id
      AND access_granted = TRUE
      AND expires_at > NOW()
      AND revoked_at IS NULL
    ) INTO emergency_access;
    
    IF emergency_access THEN
      access_granted := TRUE;
    END IF;
  END IF;

  -- Log all access attempts
  PERFORM public.log_security_monitoring(
    accessing_user_id,
    p_client_id,
    CASE WHEN access_granted THEN 'client_data_access' ELSE 'policy_violation' END,
    CASE 
      WHEN access_granted AND emergency_access THEN 'high'
      WHEN access_granted THEN 'medium'
      ELSE 'critical'
    END,
    jsonb_build_object(
      'operation', p_operation,
      'access_granted', access_granted,
      'emergency_access', emergency_access,
      'justification', p_justification,
      'user_role', user_role,
      'client_owner', client_owner_id
    )
  );

  RETURN access_granted;
END;
$$;

-- Function to grant emergency access
CREATE OR REPLACE FUNCTION public.grant_emergency_access(
  p_client_id UUID,
  p_justification TEXT,
  p_emergency_type TEXT DEFAULT 'other',
  p_duration INTERVAL DEFAULT INTERVAL '1 hour'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emergency_id UUID;
  accessing_user_id UUID := auth.uid();
  user_role app_role;
BEGIN
  -- Only allow supervisors and above to grant emergency access
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  IF user_role NOT IN ('admin', 'supervisor', 'manager') THEN
    RAISE EXCEPTION 'Insufficient privileges for emergency access';
  END IF;

  -- Create emergency access record
  INSERT INTO public.emergency_access_log (
    accessing_user_id,
    target_client_id,
    justification,
    authorized_by,
    access_granted,
    emergency_type,
    access_duration,
    expires_at
  ) VALUES (
    accessing_user_id,
    p_client_id,
    p_justification,
    accessing_user_id,
    TRUE,
    p_emergency_type,
    p_duration,
    NOW() + p_duration
  ) RETURNING id INTO emergency_id;

  -- Log emergency access grant
  PERFORM public.log_security_monitoring(
    accessing_user_id,
    p_client_id,
    'emergency_access',
    'critical',
    jsonb_build_object(
      'emergency_id', emergency_id,
      'justification', p_justification,
      'emergency_type', p_emergency_type,
      'duration_minutes', EXTRACT(EPOCH FROM p_duration) / 60,
      'authorized_by', accessing_user_id
    )
  );

  RETURN emergency_id;
END;
$$;

-- Enhanced clients table security trigger (only for INSERT/UPDATE/DELETE)
CREATE OR REPLACE FUNCTION public.enhanced_client_security_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  operation_allowed BOOLEAN;
  accessing_user_id UUID := auth.uid();
BEGIN
  -- Check zero-trust access for all operations
  operation_allowed := public.zero_trust_client_access(
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    current_setting('app.access_justification', true)
  );

  IF NOT operation_allowed THEN
    RAISE EXCEPTION 'Access denied: Zero-trust policy violation for client data operation';
  END IF;

  -- Log sensitive field access for UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_monitoring(
      accessing_user_id,
      NEW.id,
      'sensitive_field_access',
      'medium',
      jsonb_build_object(
        'operation', TG_OP,
        'encrypted_fields_accessed', ARRAY[
          CASE WHEN NEW.encrypted_ssn IS NOT NULL THEN 'ssn' END,
          CASE WHEN NEW.encrypted_passport_number IS NOT NULL THEN 'passport' END,
          CASE WHEN NEW.encrypted_payment_info IS NOT NULL THEN 'payment' END
        ]
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Replace existing RLS policies with zero-trust policies
DROP POLICY IF EXISTS "ABSOLUTE_DENY_anonymous_access_to_clients" ON public.clients;
DROP POLICY IF EXISTS "MAXIMUM_SECURITY_clients_select" ON public.clients;
DROP POLICY IF EXISTS "MAXIMUM_SECURITY_clients_insert" ON public.clients;
DROP POLICY IF EXISTS "MAXIMUM_SECURITY_clients_update" ON public.clients;
DROP POLICY IF EXISTS "MAXIMUM_SECURITY_clients_delete" ON public.clients;

-- Zero-trust RLS policies
CREATE POLICY "ZERO_TRUST_clients_select" ON public.clients
FOR SELECT USING (public.zero_trust_client_access(id, 'SELECT'));

CREATE POLICY "ZERO_TRUST_clients_insert" ON public.clients
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id AND
  public.zero_trust_client_access(id, 'INSERT')
);

CREATE POLICY "ZERO_TRUST_clients_update" ON public.clients
FOR UPDATE USING (public.zero_trust_client_access(id, 'UPDATE'))
WITH CHECK (public.zero_trust_client_access(id, 'UPDATE'));

CREATE POLICY "ZERO_TRUST_clients_delete" ON public.clients
FOR DELETE USING (public.zero_trust_client_access(id, 'DELETE'));

-- Attach enhanced security trigger (only for modification operations)
DROP TRIGGER IF EXISTS enhanced_client_security_trigger ON public.clients;
CREATE TRIGGER enhanced_client_security_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_client_security_trigger();

-- RLS policies for security monitoring tables
ALTER TABLE public.security_monitoring ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Security admins can view monitoring" ON public.security_monitoring
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
);

CREATE POLICY "System can insert monitoring" ON public.security_monitoring
FOR INSERT WITH CHECK (true);

ALTER TABLE public.client_encryption_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System manages encryption keys" ON public.client_encryption_keys
FOR ALL USING (false) WITH CHECK (false);

ALTER TABLE public.emergency_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Emergency access audit" ON public.emergency_access_log
FOR SELECT USING (
  auth.uid() = accessing_user_id OR 
  EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "System creates emergency access" ON public.emergency_access_log
FOR INSERT WITH CHECK (true);

-- Anomaly detection function
CREATE OR REPLACE FUNCTION public.detect_security_anomalies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  anomaly_record RECORD;
BEGIN
  -- Detect bulk access patterns (more than 10 client records in 5 minutes)
  FOR anomaly_record IN 
    SELECT 
      user_id,
      COUNT(DISTINCT client_id) as client_count,
      COUNT(*) as total_accesses
    FROM public.security_monitoring 
    WHERE timestamp > NOW() - INTERVAL '5 minutes'
    AND event_type = 'client_data_access'
    GROUP BY user_id
    HAVING COUNT(DISTINCT client_id) > 10
  LOOP
    PERFORM public.log_security_monitoring(
      anomaly_record.user_id,
      NULL,
      'anomaly_detected',
      'critical',
      jsonb_build_object(
        'anomaly_type', 'bulk_access_pattern',
        'clients_accessed', anomaly_record.client_count,
        'total_accesses', anomaly_record.total_accesses,
        'time_window', '5 minutes'
      )
    );
  END LOOP;

  -- Detect unusual access times (outside business hours)
  FOR anomaly_record IN
    SELECT user_id, client_id, COUNT(*) as access_count
    FROM public.security_monitoring
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    AND event_type = 'client_data_access'
    AND (EXTRACT(hour FROM timestamp) < 6 OR EXTRACT(hour FROM timestamp) > 22)
    GROUP BY user_id, client_id
    HAVING COUNT(*) > 3
  LOOP
    PERFORM public.log_security_monitoring(
      anomaly_record.user_id,
      anomaly_record.client_id,
      'anomaly_detected',
      'high',
      jsonb_build_object(
        'anomaly_type', 'unusual_access_time',
        'access_count', anomaly_record.access_count,
        'detection_window', 'outside_business_hours'
      )
    );
  END LOOP;
END;
$$;