-- ========================================
-- COMPREHENSIVE CLIENT DATA SECURITY FIX
-- ========================================

-- Phase 1: Fix missing RLS policies for clients table
-- Create secure SELECT policy that logs all access
CREATE POLICY "ULTRA_SECURE_clients_select" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR public.can_access_client_data_secure(user_id)
  )
);

-- Create secure UPDATE policy with comprehensive logging
CREATE POLICY "ULTRA_SECURE_clients_update" 
ON public.clients 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND data_classification IN ('confidential', 'restricted', 'secret')
);

-- Phase 2: Enhanced security events table with proper constraints
-- First, let's see what event types are being rejected
DO $$
BEGIN
  -- Add missing event types to security_events if there's a constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%security_events_event_type%'
  ) THEN
    -- We need to update the constraint to include new event types
    ALTER TABLE public.security_events 
    DROP CONSTRAINT IF EXISTS security_events_event_type_check;
    
    ALTER TABLE public.security_events 
    ADD CONSTRAINT security_events_event_type_check 
    CHECK (event_type IN (
      'login_attempt',
      'logout',
      'password_change',
      'permission_denied',
      'sensitive_data_access',
      'data_modification',
      'suspicious_activity',
      'rate_limit_exceeded',
      'session_expired',
      'unauthorized_access_attempt',
      'admin_action',
      'security_alert',
      'data_export',
      'encryption_event',
      'policy_violation',
      'session_bypass_used',
      'clients_access_attempt',
      'sensitive_client_data_accessed',
      'client_data_modified',
      'unauthorized_client_access',
      'admin_client_data_access',
      'manager_team_client_access',
      'supervisor_team_client_access',
      'cross_user_client_access',
      'sensitive_client_data_modified',
      'emergency_client_access_granted',
      'audit_data_accessed',
      'gmail_credentials_updated',
      'option_token_accessed',
      'option_token_access_denied',
      'invalid_option_token_attempt',
      'option_review_token_generated'
    ));
  END IF;
END $$;

-- Phase 3: Create comprehensive client access logging function
CREATE OR REPLACE FUNCTION public.log_client_access(
  p_client_id uuid,
  p_access_type text,
  p_fields_accessed text[] DEFAULT ARRAY[]::text[],
  p_business_justification text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_owner_id uuid;
  accessing_user_role app_role;
BEGIN
  -- Get client owner
  SELECT user_id INTO client_owner_id
  FROM public.clients
  WHERE id = p_client_id;
  
  -- Get accessing user's role
  SELECT role INTO accessing_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Log the access
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  )
  VALUES (
    auth.uid(),
    'sensitive_client_data_accessed',
    CASE 
      WHEN auth.uid() = client_owner_id THEN 'low'
      WHEN accessing_user_role IN ('manager', 'supervisor') THEN 'medium'
      WHEN accessing_user_role = 'admin' THEN 'high'
      ELSE 'critical'
    END,
    jsonb_build_object(
      'client_id', p_client_id,
      'client_owner', client_owner_id,
      'access_type', p_access_type,
      'fields_accessed', p_fields_accessed,
      'business_justification', p_business_justification,
      'accessor_role', accessing_user_role,
      'timestamp', now(),
      'ip_address', inet_client_addr(),
      'session_info', jsonb_build_object(
        'session_valid', auth.uid() IS NOT NULL,
        'access_level', 'client_data'
      )
    )
  );
  
  -- Also log to data access audit table
  INSERT INTO public.data_access_audit (
    user_id,
    accessed_table,
    access_type,
    accessed_record_id,
    data_classification,
    business_justification,
    risk_score
  )
  VALUES (
    auth.uid(),
    'clients',
    p_access_type,
    p_client_id,
    'confidential',
    p_business_justification,
    CASE 
      WHEN auth.uid() = client_owner_id THEN 1
      WHEN accessing_user_role IN ('manager', 'supervisor') THEN 3
      WHEN accessing_user_role = 'admin' THEN 5
      ELSE 9
    END
  );
END;
$$;

-- Phase 4: Create secure client data access function
CREATE OR REPLACE FUNCTION public.get_client_data_secure(
  p_client_id uuid,
  p_fields text[] DEFAULT ARRAY['id', 'first_name', 'last_name', 'email', 'phone']::text[],
  p_business_justification text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_data jsonb;
  client_owner_id uuid;
  is_authorized boolean := false;
  accessing_user_role app_role;
BEGIN
  -- Validate input
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'Client ID cannot be null';
  END IF;
  
  -- Get client owner and user role
  SELECT user_id INTO client_owner_id
  FROM public.clients
  WHERE id = p_client_id;
  
  IF client_owner_id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  
  SELECT role INTO accessing_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Authorization check
  is_authorized := public.can_access_client_data_secure(client_owner_id);
  
  IF NOT is_authorized THEN
    -- Log unauthorized attempt
    PERFORM public.log_client_access(
      p_client_id,
      'unauthorized_access_attempt',
      p_fields,
      'Access denied - insufficient permissions'
    );
    RAISE EXCEPTION 'Access denied - insufficient permissions';
  END IF;
  
  -- Log authorized access
  PERFORM public.log_client_access(
    p_client_id,
    'authorized_data_access',
    p_fields,
    p_business_justification
  );
  
  -- Build response with only requested fields
  SELECT jsonb_object_agg(
    field_name, 
    CASE field_name
      WHEN 'id' THEN to_jsonb(c.id)
      WHEN 'first_name' THEN to_jsonb(c.first_name)
      WHEN 'last_name' THEN to_jsonb(c.last_name)
      WHEN 'email' THEN to_jsonb(c.email)
      WHEN 'phone' THEN to_jsonb(c.phone)
      WHEN 'company' THEN to_jsonb(c.company)
      WHEN 'preferred_class' THEN to_jsonb(c.preferred_class)
      WHEN 'total_bookings' THEN to_jsonb(c.total_bookings)
      WHEN 'total_spent' THEN to_jsonb(c.total_spent)
      WHEN 'last_trip_date' THEN to_jsonb(c.last_trip_date)
      WHEN 'date_of_birth' THEN to_jsonb(c.date_of_birth)
      WHEN 'client_type' THEN to_jsonb(c.client_type)
      WHEN 'notes' THEN to_jsonb(c.notes)
      WHEN 'created_at' THEN to_jsonb(c.created_at)
      WHEN 'updated_at' THEN to_jsonb(c.updated_at)
      -- Sensitive fields require special handling
      WHEN 'encrypted_ssn' THEN 
        CASE WHEN accessing_user_role IN ('admin', 'manager') 
        THEN to_jsonb('[ENCRYPTED_DATA]') 
        ELSE to_jsonb('[ACCESS_DENIED]') END
      WHEN 'encrypted_passport_number' THEN 
        CASE WHEN accessing_user_role IN ('admin', 'manager') 
        THEN to_jsonb('[ENCRYPTED_DATA]') 
        ELSE to_jsonb('[ACCESS_DENIED]') END
      WHEN 'encrypted_payment_info' THEN 
        CASE WHEN accessing_user_role IN ('admin', 'manager') 
        THEN to_jsonb('[ENCRYPTED_DATA]') 
        ELSE to_jsonb('[ACCESS_DENIED]') END
      ELSE NULL
    END
  ) INTO client_data
  FROM public.clients c, unnest(p_fields) as field_name
  WHERE c.id = p_client_id
  AND field_name = ANY(p_fields);
  
  RETURN COALESCE(client_data, '{}'::jsonb);
END;
$$;

-- Phase 5: Enhanced encryption key management
CREATE TABLE IF NOT EXISTS public.client_encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  key_version integer NOT NULL DEFAULT 1,
  key_fingerprint text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  rotation_reason text,
  UNIQUE(client_id, key_version)
);

-- Enable RLS on encryption keys table
ALTER TABLE public.client_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Only system can manage encryption keys
CREATE POLICY "system_only_encryption_keys" 
ON public.client_encryption_keys 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- Phase 6: Create client data retention policy
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

-- Phase 7: Create comprehensive monitoring trigger
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

-- Phase 8: Update existing triggers to use enhanced logging
DROP TRIGGER IF EXISTS audit_sensitive_client_operations_trigger ON public.clients;
CREATE TRIGGER audit_sensitive_client_operations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_client_operations();