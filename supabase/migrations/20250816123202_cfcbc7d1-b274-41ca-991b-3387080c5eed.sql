-- Fix security event check constraint to include missing event types
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;

-- Add comprehensive check constraint for all possible security event types
ALTER TABLE public.security_events ADD CONSTRAINT security_events_event_type_check 
  CHECK (event_type IN (
    'login_success', 'login_failure', 'logout', 'password_change', 'password_reset',
    'unauthorized_access_attempt', 'sensitive_data_access', 'admin_action', 
    'security_scan_completed', 'threat_level_elevated', 'suspicious_activity',
    'data_breach_detected', 'failed_authentication', 'account_locked',
    'privilege_escalation', 'data_export_request', 'gdpr_request',
    'client_sensitive_modified', 'cross_user_client_access', 'admin_client_data_access',
    'manager_team_client_access', 'supervisor_team_client_access',
    'unauthorized_client_access_attempt', 'emergency_client_access_granted',
    'sensitive_client_data_modified', 'gmail_credentials_updated',
    'token_storage_blocked', 'invalid_oauth_state_token', 'option_token_access_denied',
    'option_token_accessed', 'option_review_token_generated', 'invalid_option_token_attempt',
    'rate_limit_exceeded', 'session_bypass_used', 'audit_data_accessed',
    'encryption_audit_log', 'unauthorized_sensitive_access', 'sensitive_table_access',
    'security_event_logged', 'captcha_verification_failed', 'captcha_verification_success',
    'captcha_health_check', 'suspicious_activity_pattern'
  ));

-- Enhance data masking for client display
CREATE OR REPLACE FUNCTION public.mask_client_data(
  p_client_data jsonb,
  p_user_role app_role DEFAULT 'agent'::app_role
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  masked_data jsonb := p_client_data;
BEGIN
  -- Always mask sensitive data in transit
  IF masked_data ? 'email' THEN
    masked_data := jsonb_set(masked_data, '{email}', 
      to_jsonb(CASE 
        WHEN p_user_role = 'admin' THEN masked_data->>'email'
        ELSE regexp_replace(masked_data->>'email', '^(.{2}).*(@.+)$', '\1***\2')
      END)
    );
  END IF;
  
  IF masked_data ? 'phone' THEN
    masked_data := jsonb_set(masked_data, '{phone}', 
      to_jsonb(CASE 
        WHEN p_user_role = 'admin' THEN masked_data->>'phone'
        ELSE regexp_replace(COALESCE(masked_data->>'phone', ''), '(\d{3})\d+(\d{4})', '\1***\2')
      END)
    );
  END IF;
  
  -- Remove encrypted fields from JSON response
  masked_data := masked_data - 'encrypted_ssn' - 'encrypted_passport_number' - 'encrypted_payment_info';
  
  RETURN masked_data;
END;
$$;

-- Enhanced secure client data access function
CREATE OR REPLACE FUNCTION public.get_client_data_secure(
  p_client_id uuid,
  p_include_sensitive boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_data jsonb;
  user_role app_role;
  client_owner_id uuid;
  is_authorized boolean := false;
BEGIN
  -- Get current user role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Get client owner
  SELECT user_id INTO client_owner_id
  FROM public.clients
  WHERE id = p_client_id;
  
  -- Check authorization
  is_authorized := (
    auth.uid() = client_owner_id OR
    user_role IN ('admin', 'manager', 'supervisor')
  );
  
  IF NOT is_authorized THEN
    -- Log unauthorized attempt
    PERFORM public.log_security_event(
      'unauthorized_client_data_access',
      'critical',
      jsonb_build_object(
        'client_id', p_client_id,
        'attempted_by', auth.uid(),
        'client_owner', client_owner_id
      )
    );
    
    RAISE EXCEPTION 'Access denied to client data' USING ERRCODE = '42501';
  END IF;
  
  -- Log authorized access
  PERFORM public.log_security_event(
    'authorized_client_data_access',
    'low',
    jsonb_build_object(
      'client_id', p_client_id,
      'accessed_by', auth.uid(),
      'user_role', user_role,
      'include_sensitive', p_include_sensitive
    )
  );
  
  -- Get client data
  SELECT to_jsonb(c.*) INTO client_data
  FROM public.clients c
  WHERE c.id = p_client_id;
  
  -- Apply data masking based on role and request
  IF NOT p_include_sensitive OR user_role NOT IN ('admin') THEN
    client_data := public.mask_client_data(client_data, user_role);
  END IF;
  
  RETURN client_data;
END;
$$;

-- Create emergency access override function (admin only)
CREATE OR REPLACE FUNCTION public.emergency_client_access(
  p_client_id uuid,
  p_justification text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
  client_data jsonb;
BEGIN
  -- Only admins can use emergency access
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Emergency access requires admin privileges' USING ERRCODE = '42501';
  END IF;
  
  -- Log emergency access
  PERFORM public.log_security_event(
    'emergency_client_access_used',
    'critical',
    jsonb_build_object(
      'client_id', p_client_id,
      'admin_id', auth.uid(),
      'justification', p_justification,
      'timestamp', now()
    )
  );
  
  -- Return full client data with emergency access
  SELECT to_jsonb(c.*) INTO client_data
  FROM public.clients c
  WHERE c.id = p_client_id;
  
  RETURN client_data;
END;
$$;