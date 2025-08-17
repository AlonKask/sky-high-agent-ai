-- Comprehensive Security Fix Migration
-- This migration addresses all security vulnerabilities systematically

-- Step 1: Drop all conflicting function versions to start clean
DROP FUNCTION IF EXISTS public.mask_sensitive_data(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.mask_sensitive_data(text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_business_hours_access() CASCADE;
DROP FUNCTION IF EXISTS public.can_access_client_data_ultra_strict(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_gmail_credentials_enhanced(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.log_security_event(text, text, jsonb) CASCADE;

-- Step 2: Create secure utility functions with proper signatures
CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
    AND role = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_severity text, p_details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, severity, details, timestamp, user_agent, ip_address
  ) VALUES (
    auth.uid(),
    p_event_type,
    p_severity,
    p_details,
    now(),
    p_details->>'user_agent',
    CASE 
      WHEN p_details->>'ip_address' IS NOT NULL 
      THEN (p_details->>'ip_address')::inet 
      ELSE NULL 
    END
  );
EXCEPTION WHEN OTHERS THEN
  -- Log errors but don't fail the transaction
  NULL;
END;
$$;

-- Step 3: Enhanced data masking function
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(p_data text, p_field_type text DEFAULT 'general'::text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_data IS NULL OR length(p_data) = 0 THEN
    RETURN p_data;
  END IF;

  CASE p_field_type
    WHEN 'email' THEN
      RETURN CASE 
        WHEN position('@' in p_data) > 0 THEN
          substring(p_data from 1 for 2) || '****@' || 
          substring(p_data from position('@' in p_data) + 1)
        ELSE '****'
      END;
    WHEN 'phone' THEN
      RETURN CASE 
        WHEN length(p_data) >= 10 THEN
          '****-****-' || right(p_data, 4)
        ELSE '****'
      END;
    WHEN 'ssn' THEN
      RETURN 'XXX-XX-' || COALESCE(right(p_data, 4), 'XXXX');
    WHEN 'passport' THEN
      RETURN left(p_data, 2) || repeat('*', greatest(length(p_data) - 4, 0)) || right(p_data, 2);
    WHEN 'payment' THEN
      RETURN '****-****-****-' || COALESCE(right(p_data, 4), 'XXXX');
    ELSE
      RETURN repeat('*', length(p_data));
  END CASE;
END;
$$;

-- Step 4: Business hours validation
CREATE OR REPLACE FUNCTION public.validate_business_hours_access()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_hour integer;
  current_dow integer;
  user_role_check app_role;
BEGIN
  -- Admin users bypass business hours restrictions
  SELECT role INTO user_role_check
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  IF user_role_check = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Get current time in UTC (adjust timezone as needed)
  current_hour := EXTRACT(hour FROM now());
  current_dow := EXTRACT(dow FROM now()); -- 0=Sunday, 1=Monday, ..., 6=Saturday
  
  -- Business hours: Monday (1) to Friday (5), 9 AM to 6 PM
  IF current_dow BETWEEN 1 AND 5 AND current_hour BETWEEN 9 AND 17 THEN
    RETURN true;
  END IF;
  
  -- Log after-hours access attempt
  PERFORM public.log_security_event(
    'after_hours_access_attempt',
    'medium',
    jsonb_build_object(
      'hour', current_hour,
      'day_of_week', current_dow,
      'user_role', user_role_check
    )
  );
  
  RETURN false;
END;
$$;

-- Step 5: Ultra-strict client data access control
CREATE OR REPLACE FUNCTION public.can_access_client_data_ultra_strict(p_target_user_id uuid, p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role_check app_role;
  client_owner_id uuid;
  is_team_member boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR p_target_user_id IS NULL THEN
    PERFORM public.log_security_event(
      'unauthorized_access_attempt',
      'critical',
      jsonb_build_object('reason', 'unauthenticated_access', 'client_id', p_client_id)
    );
    RETURN false;
  END IF;
  
  -- Verify client ownership
  SELECT user_id INTO client_owner_id
  FROM public.clients
  WHERE id = p_client_id;
  
  IF client_owner_id != p_target_user_id THEN
    PERFORM public.log_security_event(
      'data_integrity_violation',
      'critical',
      jsonb_build_object('client_id', p_client_id, 'expected_owner', p_target_user_id, 'actual_owner', client_owner_id)
    );
    RETURN false;
  END IF;
  
  -- Allow users to access their own data
  IF accessing_user_id = p_target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get accessing user's role
  SELECT role INTO user_role_check
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- Check if within business hours for non-admin access
  IF user_role_check != 'admin' AND NOT public.validate_business_hours_access() THEN
    PERFORM public.log_security_event(
      'after_hours_client_access_denied',
      'high',
      jsonb_build_object(
        'accessing_user', accessing_user_id,
        'target_user', p_target_user_id,
        'client_id', p_client_id
      )
    );
    RETURN false;
  END IF;
  
  -- For managers and supervisors: Only allow access to direct team members
  IF user_role_check IN ('manager', 'supervisor') THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = p_target_user_id
    ) INTO is_team_member;
    
    IF is_team_member THEN
      PERFORM public.log_security_event(
        'authorized_team_client_access',
        'medium',
        jsonb_build_object(
          'manager_id', accessing_user_id,
          'team_member_id', p_target_user_id,
          'client_id', p_client_id,
          'role', user_role_check
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: Allow but require heavy logging
  IF user_role_check = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_client_access_override',
      'critical',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user', p_target_user_id,
        'client_id', p_client_id,
        'requires_audit', true,
        'timestamp', now()
      )
    );
    RETURN true;
  END IF;
  
  -- Deny all other access attempts
  PERFORM public.log_security_event(
    'unauthorized_client_access_denied',
    'critical',
    jsonb_build_object(
      'accessing_user', accessing_user_id,
      'target_user', p_target_user_id,
      'client_id', p_client_id,
      'user_role', user_role_check,
      'denial_reason', 'insufficient_privileges'
    )
  );
  
  RETURN false;
END;
$$;

-- Step 6: Enhanced Gmail credentials access control
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role_check app_role;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR p_target_user_id IS NULL THEN
    PERFORM public.log_security_event(
      'gmail_credentials_unauthorized_access',
      'critical',
      jsonb_build_object('reason', 'unauthenticated', 'target_user', p_target_user_id)
    );
    RETURN false;
  END IF;
  
  -- Users can ONLY access their own Gmail credentials
  IF accessing_user_id != p_target_user_id THEN
    -- Get role for logging purposes
    SELECT role INTO user_role_check
    FROM public.user_roles
    WHERE user_id = accessing_user_id;
    
    PERFORM public.log_security_event(
      'gmail_credentials_cross_user_access_denied',
      'critical',
      jsonb_build_object(
        'accessing_user', accessing_user_id,
        'target_user', p_target_user_id,
        'user_role', user_role_check,
        'violation_type', 'cross_user_credential_access'
      )
    );
    RETURN false;
  END IF;
  
  -- Check business hours for credential access
  IF NOT public.validate_business_hours_access() THEN
    PERFORM public.log_security_event(
      'gmail_credentials_after_hours_access',
      'high',
      jsonb_build_object('user_id', accessing_user_id, 'timestamp', now())
    );
    RETURN false;
  END IF;
  
  -- Log successful credential access
  PERFORM public.log_security_event(
    'gmail_credentials_accessed',
    'low',
    jsonb_build_object('user_id', accessing_user_id, 'timestamp', now())
  );
  
  RETURN true;
END;
$$;

-- Step 7: Add encryption validation for sensitive fields
CREATE OR REPLACE FUNCTION public.validate_encryption_format(p_encrypted_data text, p_field_name text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Null values are allowed
  IF p_encrypted_data IS NULL THEN
    RETURN true;
  END IF;
  
  -- Must be base64 encoded and at least 16 characters (for proper encryption)
  IF NOT (p_encrypted_data ~ '^[A-Za-z0-9+/=\n\r]+$' 
          AND length(p_encrypted_data) >= 16 
          AND length(p_encrypted_data) % 4 = 0) THEN
    
    -- Log encryption validation failure
    PERFORM public.log_security_event(
      'encryption_validation_failed',
      'high',
      jsonb_build_object(
        'field_name', p_field_name,
        'data_length', length(p_encrypted_data),
        'user_id', auth.uid()
      )
    );
    
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Step 8: Create comprehensive audit trigger for sensitive operations
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_check app_role;
  operation_details jsonb;
BEGIN
  -- Get user role
  SELECT role INTO user_role_check
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Build operation details
  operation_details := jsonb_build_object(
    'table_name', TG_TABLE_NAME,
    'operation', TG_OP,
    'user_id', auth.uid(),
    'user_role', user_role_check,
    'timestamp', now(),
    'record_id', COALESCE(NEW.id, OLD.id)
  );
  
  -- Log all operations on sensitive tables
  PERFORM public.log_security_event(
    'sensitive_table_operation',
    CASE 
      WHEN TG_TABLE_NAME = 'clients' THEN 'high'
      WHEN TG_TABLE_NAME = 'gmail_credentials' THEN 'critical'
      WHEN TG_TABLE_NAME = 'security_events' THEN 'medium'
      ELSE 'low'
    END,
    operation_details
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 9: Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_clients_operations ON public.clients;
CREATE TRIGGER audit_clients_operations
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

DROP TRIGGER IF EXISTS audit_gmail_credentials_operations ON public.gmail_credentials;
CREATE TRIGGER audit_gmail_credentials_operations
  AFTER INSERT OR UPDATE OR DELETE ON public.gmail_credentials
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

-- Step 10: Enhanced session security validation
CREATE OR REPLACE FUNCTION public.validate_session_security()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_age interval;
  user_role_check app_role;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    PERFORM public.log_security_event(
      'unauthenticated_access_attempt',
      'high',
      jsonb_build_object('timestamp', now())
    );
    RETURN false;
  END IF;
  
  -- Get user role
  SELECT role INTO user_role_check
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Validate business hours for non-admin users
  IF user_role_check != 'admin' AND NOT public.validate_business_hours_access() THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Step 11: Create comprehensive rate limiting function
CREATE OR REPLACE FUNCTION public.check_advanced_rate_limit(
  p_identifier text,
  p_operation text,
  p_max_requests integer DEFAULT 10,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start timestamp with time zone;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Clean up old rate limit entries
  DELETE FROM public.access_rate_limits 
  WHERE window_start < now() - interval '1 hour';
  
  -- Get current request count
  SELECT COALESCE(SUM(request_count), 0) 
  INTO current_count
  FROM public.access_rate_limits
  WHERE identifier = p_identifier 
  AND endpoint = p_operation
  AND window_start > window_start;
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      'critical',
      jsonb_build_object(
        'identifier', p_identifier,
        'operation', p_operation,
        'current_count', current_count,
        'max_requests', p_max_requests,
        'window_minutes', p_window_minutes
      )
    );
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO public.access_rate_limits (identifier, endpoint, request_count)
  VALUES (p_identifier, p_operation, 1)
  ON CONFLICT (identifier, endpoint) 
  DO UPDATE SET 
    request_count = access_rate_limits.request_count + 1,
    window_start = CASE 
      WHEN access_rate_limits.window_start < now() - (p_window_minutes || ' minutes')::interval 
      THEN now() 
      ELSE access_rate_limits.window_start 
    END;
  
  RETURN true;
END;
$$;