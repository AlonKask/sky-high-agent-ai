-- First, let's see what invalid event types exist and fix them
-- Then update the constraint to include all necessary types

-- First, update any invalid event types to valid ones
UPDATE public.security_events 
SET event_type = 'sensitive_data_access'
WHERE event_type NOT IN (
  'authentication',
  'unauthorized_access_attempt', 
  'data_breach',
  'suspicious_activity',
  'password_change',
  'login_failure',
  'account_lockout',
  'permission_escalation',
  'rate_limit_exceeded',
  'gmail_credentials_access',
  'gmail_credentials_updated',
  'business_intelligence_access',
  'sales_intelligence_access',
  'client_intelligence_access',
  'sensitive_data_access',
  'sensitive_data_accessed',
  'sensitive_client_data_modified',
  'cross_user_client_access',
  'admin_client_data_access',
  'manager_team_client_access',
  'supervisor_team_client_access',
  'unauthorized_client_access_attempt',
  'client_data_select',
  'client_data_insert', 
  'client_data_update',
  'client_data_delete',
  'sensitive_table_access',
  'invalid_oauth_state_token',
  'oauth_token_access_denied',
  'option_token_accessed',
  'option_review_token_generated',
  'invalid_option_token_attempt',
  'token_storage_blocked',
  'audit_data_accessed',
  'unauthenticated_access_attempt',
  'encryption_infrastructure_breach'
);

-- Now fix the database functions to avoid ambiguous column references
-- Fix the check_advanced_rate_limit function
CREATE OR REPLACE FUNCTION public.check_advanced_rate_limit(p_identifier text, p_operation text, p_max_requests integer DEFAULT 10, p_window_minutes integer DEFAULT 15)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count integer;
  window_threshold timestamp with time zone;
BEGIN
  window_threshold := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Clean up old rate limit entries
  DELETE FROM public.access_rate_limits 
  WHERE access_rate_limits.window_start < now() - interval '1 hour';
  
  -- Get current request count
  SELECT COALESCE(SUM(request_count), 0) 
  INTO current_count
  FROM public.access_rate_limits
  WHERE identifier = p_identifier 
  AND endpoint = p_operation
  AND access_rate_limits.window_start > window_threshold;
  
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
      WHEN access_rate_limits.window_start < window_threshold 
      THEN now() 
      ELSE access_rate_limits.window_start 
    END;
  
  RETURN true;
END;
$function$;

-- Fix the check_rate_limit function as well
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier text, p_endpoint text, p_max_requests integer DEFAULT 10, p_window_minutes integer DEFAULT 15)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  window_threshold TIMESTAMP WITH TIME ZONE;
BEGIN
  window_threshold := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Clean up old entries
  DELETE FROM public.access_rate_limits 
  WHERE access_rate_limits.window_start < now() - INTERVAL '1 hour';
  
  -- Get current count for this identifier/endpoint
  SELECT COALESCE(SUM(request_count), 0) 
  INTO current_count
  FROM public.access_rate_limits
  WHERE identifier = p_identifier 
  AND endpoint = p_endpoint
  AND access_rate_limits.window_start > window_threshold;
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    -- Log rate limit violation
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      'sensitive_data_access',
      jsonb_build_object(
        'identifier', p_identifier,
        'endpoint', p_endpoint,
        'current_count', current_count,
        'max_requests', p_max_requests
      )
    );
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO public.access_rate_limits (identifier, endpoint, request_count)
  VALUES (p_identifier, p_endpoint, 1)
  ON CONFLICT (identifier, endpoint) 
  DO UPDATE SET 
    request_count = access_rate_limits.request_count + 1,
    window_start = CASE 
      WHEN access_rate_limits.window_start < window_threshold
      THEN now() 
      ELSE access_rate_limits.window_start 
    END;
  
  RETURN TRUE;
END;
$function$;