-- Security Enhancement Phase 1: RLS Policy Improvements and Security Headers

-- 1. Enhance email_exchanges RLS with session validation for additional security
DROP POLICY IF EXISTS "email_exchanges_users_own_data_only" ON public.email_exchanges;

CREATE POLICY "Enhanced email exchanges isolation" 
ON public.email_exchanges 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND validate_session_security()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- 2. Add enhanced admin access control with business justification
CREATE OR REPLACE FUNCTION public.log_admin_data_access(
  p_table_name text,
  p_record_id uuid,
  p_justification text,
  p_target_user_id uuid DEFAULT NULL
) 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Only admin/manager/supervisor can use this
  IF user_role NOT IN ('admin', 'manager', 'supervisor') THEN
    RETURN false;
  END IF;
  
  -- Require detailed justification for sensitive data access
  IF p_justification IS NULL OR length(trim(p_justification)) < 10 THEN
    PERFORM public.log_security_event(
      'insufficient_admin_justification',
      'high',
      jsonb_build_object(
        'admin_id', auth.uid(),
        'table_name', p_table_name,
        'record_id', p_record_id,
        'justification_length', COALESCE(length(trim(p_justification)), 0)
      )
    );
    RETURN false;
  END IF;
  
  -- Log the admin access with full details
  PERFORM public.log_security_event(
    'admin_data_access_with_justification',
    'medium',
    jsonb_build_object(
      'admin_id', auth.uid(),
      'admin_role', user_role,
      'table_name', p_table_name,
      'record_id', p_record_id,
      'target_user_id', p_target_user_id,
      'justification', p_justification,
      'timestamp', now(),
      'requires_review', true
    )
  );
  
  RETURN true;
END;
$$;

-- 3. Add enhanced security monitoring for critical operations
CREATE OR REPLACE FUNCTION public.monitor_sensitive_table_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role app_role;
  owner_id uuid;
BEGIN
  -- Get user role if authenticated
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = auth.uid();
  END IF;
  
  -- Determine record owner based on table
  CASE TG_TABLE_NAME
    WHEN 'clients' THEN owner_id := COALESCE(NEW.user_id, OLD.user_id);
    WHEN 'email_exchanges' THEN owner_id := COALESCE(NEW.user_id, OLD.user_id);
    WHEN 'quotes' THEN owner_id := COALESCE(NEW.user_id, OLD.user_id);
    ELSE owner_id := NULL;
  END CASE;
  
  -- Log cross-user access by elevated roles
  IF auth.uid() IS NOT NULL AND auth.uid() != owner_id AND user_role IN ('admin', 'manager', 'supervisor') THEN
    PERFORM public.log_security_event(
      'elevated_role_cross_user_access',
      'medium',
      jsonb_build_object(
        'accessing_user_id', auth.uid(),
        'accessing_user_role', user_role,
        'table_name', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', COALESCE(NEW.id, OLD.id),
        'record_owner', owner_id,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Add monitoring triggers to sensitive tables (only if not already present)
DROP TRIGGER IF EXISTS sensitive_access_monitor_clients ON public.clients;
CREATE TRIGGER sensitive_access_monitor_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_table_access();

DROP TRIGGER IF EXISTS sensitive_access_monitor_quotes ON public.quotes;
CREATE TRIGGER sensitive_access_monitor_quotes
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_table_access();

-- 5. Enhanced rate limiting function for security operations
CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(
  p_operation text,
  p_user_id uuid DEFAULT auth.uid(),
  p_max_requests integer DEFAULT 10,
  p_window_seconds integer DEFAULT 300
) 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_count integer;
  window_start timestamptz;
BEGIN
  -- Calculate window start time
  window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  -- Count recent requests for this operation and user
  SELECT COUNT(*) INTO request_count
  FROM public.security_events
  WHERE user_id = p_user_id
    AND event_type = 'rate_limit_check'
    AND details->>'operation' = p_operation
    AND timestamp > window_start;
  
  -- Log the rate limit check
  PERFORM public.log_security_event(
    'rate_limit_check',
    'low',
    jsonb_build_object(
      'operation', p_operation,
      'current_count', request_count,
      'max_allowed', p_max_requests,
      'window_seconds', p_window_seconds,
      'within_limit', request_count < p_max_requests
    )
  );
  
  -- Return true if within limit, false if exceeded
  RETURN request_count < p_max_requests;
END;
$$;