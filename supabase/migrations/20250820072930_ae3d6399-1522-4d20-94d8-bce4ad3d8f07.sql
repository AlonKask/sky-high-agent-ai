-- Phase 1: Critical Security Fixes

-- 1. Create enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_advanced_rate_limit(
  p_identifier text,
  p_action text,
  p_max_requests integer DEFAULT 5,
  p_window_seconds integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start timestamp;
BEGIN
  window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  -- Count recent requests
  SELECT COUNT(*) INTO current_count
  FROM security_events
  WHERE details->>'identifier' = p_identifier
    AND details->>'action' = p_action
    AND timestamp > window_start;
  
  -- Log rate limit check
  INSERT INTO security_events (event_type, severity, details)
  VALUES (
    'rate_limit_check',
    CASE WHEN current_count >= p_max_requests THEN 'high' ELSE 'low' END,
    jsonb_build_object(
      'identifier', p_identifier,
      'action', p_action,
      'current_count', current_count,
      'max_requests', p_max_requests,
      'blocked', current_count >= p_max_requests
    )
  );
  
  RETURN current_count < p_max_requests;
END;
$$;

-- 2. Create business hours validation function
CREATE OR REPLACE FUNCTION public.validate_business_hours_access()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_hour integer;
BEGIN
  current_hour := EXTRACT(hour FROM now() AT TIME ZONE 'UTC');
  
  -- Allow access during business hours (8 AM - 8 PM UTC) or for admins
  RETURN (current_hour >= 8 AND current_hour <= 20) OR 
         EXISTS (
           SELECT 1 FROM user_roles 
           WHERE user_id = auth.uid() 
           AND role = 'admin'
         );
END;
$$;

-- 3. Create role checking function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = p_role
  );
$$;

-- 4. Create function to check satisfaction scores access
CREATE OR REPLACE FUNCTION public.can_access_satisfaction_scores(p_client_id uuid, p_agent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Agents can view their own scores
  IF auth.uid() = p_agent_id THEN
    RETURN true;
  END IF;
  
  -- Client owners can view scores for their clients
  IF EXISTS (
    SELECT 1 FROM clients 
    WHERE id = p_client_id 
    AND user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Admins can view all scores
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 5. Create function to check team management capabilities
CREATE OR REPLACE FUNCTION public.can_manage_teams(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(p_user_id, 'admin') OR 
         public.has_role(p_user_id, 'manager') OR 
         public.has_role(p_user_id, 'supervisor');
$$;

-- 6. Enhanced security event logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO security_events (
    id,
    user_id,
    event_type,
    severity,
    details,
    timestamp
  ) VALUES (
    gen_random_uuid(),
    COALESCE(p_user_id, auth.uid()),
    p_event_type,
    p_severity,
    p_details || jsonb_build_object(
      'timestamp', now(),
      'session_info', jsonb_build_object(
        'authenticated', auth.uid() IS NOT NULL,
        'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
      )
    ),
    now()
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- 7. Secure function to update client encrypted fields
CREATE OR REPLACE FUNCTION public.update_client_encrypted_field(
  p_client_id uuid,
  p_field_name text,
  p_new_value text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_owner_id uuid;
BEGIN
  -- Get client owner
  SELECT user_id INTO client_owner_id
  FROM clients
  WHERE id = p_client_id;
  
  -- Only allow owners to update their client data
  IF client_owner_id != auth.uid() THEN
    PERFORM log_security_event(
      'unauthorized_encrypted_field_update',
      'critical',
      jsonb_build_object(
        'client_id', p_client_id,
        'field_name', p_field_name,
        'client_owner', client_owner_id,
        'attempted_by', auth.uid()
      )
    );
    RETURN false;
  END IF;
  
  -- Log the update
  PERFORM log_security_event(
    'encrypted_field_updated',
    'high',
    jsonb_build_object(
      'client_id', p_client_id,
      'field_name', p_field_name,
      'updated_by', auth.uid()
    )
  );
  
  -- Update the field
  IF p_field_name = 'encrypted_ssn' THEN
    UPDATE clients SET encrypted_ssn = p_new_value WHERE id = p_client_id;
  ELSIF p_field_name = 'encrypted_passport_number' THEN
    UPDATE clients SET encrypted_passport_number = p_new_value WHERE id = p_client_id;
  ELSIF p_field_name = 'encrypted_payment_info' THEN
    UPDATE clients SET encrypted_payment_info = p_new_value::jsonb WHERE id = p_client_id;
  ELSE
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;