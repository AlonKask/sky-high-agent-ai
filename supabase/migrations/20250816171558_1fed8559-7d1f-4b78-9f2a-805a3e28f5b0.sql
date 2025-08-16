-- Fix search_path security issue in all functions
-- Update functions to include proper security definer settings

-- Fix log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, severity, details, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    p_event_type,
    p_severity,
    p_details,
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
EXCEPTION WHEN OTHERS THEN
  -- Log failure but don't block the calling function
  RAISE WARNING 'Failed to log security event: %', SQLERRM;
END;
$$;

-- Fix can_access_client_data_ultra_strict function
CREATE OR REPLACE FUNCTION public.can_access_client_data_ultra_strict(
  target_user_id uuid,
  client_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_team_member boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Allow users to access their own client data only
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get the accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- Only supervisors and admins can access other users' client data
  -- and only for direct team members
  IF user_role IN ('supervisor', 'admin') THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_team_member;
    
    IF is_team_member THEN
      -- Log access for audit
      PERFORM public.log_security_event(
        'cross_user_client_access',
        'medium',
        jsonb_build_object(
          'accessing_user', accessing_user_id,
          'target_user', target_user_id,
          'client_id', client_id,
          'role', user_role
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- Log unauthorized attempt
  PERFORM public.log_security_event(
    'unauthorized_client_access_blocked',
    'high',
    jsonb_build_object(
      'accessing_user', accessing_user_id,
      'target_user', target_user_id,
      'client_id', client_id,
      'role', user_role
    )
  );
  
  RETURN false;
END;
$$;

-- Fix can_access_gmail_credentials_enhanced function
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
BEGIN
  -- Only the user themselves can access their Gmail credentials
  -- No exceptions for any role
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  IF accessing_user_id != target_user_id THEN
    -- Log unauthorized attempt
    PERFORM public.log_security_event(
      'unauthorized_gmail_access_blocked',
      'critical',
      jsonb_build_object(
        'accessing_user', accessing_user_id,
        'target_user', target_user_id
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(
  user_id uuid,
  required_role app_role
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE public.user_roles.user_id = has_role.user_id;
  
  RETURN user_role = required_role;
END;
$$;

-- Fix can_manage_teams function
CREATE OR REPLACE FUNCTION public.can_manage_teams(
  user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.has_role(user_id, 'manager'::app_role) OR 
         public.has_role(user_id, 'supervisor'::app_role) OR 
         public.has_role(user_id, 'admin'::app_role);
END;
$$;

-- Add enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer DEFAULT 10,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Clean up old entries
  DELETE FROM public.access_rate_limits 
  WHERE window_start < now() - INTERVAL '2 hours';
  
  -- Get current count for this identifier/endpoint
  SELECT COALESCE(SUM(request_count), 0) 
  INTO current_count
  FROM public.access_rate_limits
  WHERE identifier = p_identifier 
  AND endpoint = p_endpoint
  AND window_start > now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    -- Log rate limit violation with enhanced details
    PERFORM public.log_security_event(
      'enhanced_rate_limit_exceeded',
      'high',
      jsonb_build_object(
        'identifier', p_identifier,
        'endpoint', p_endpoint,
        'current_count', current_count,
        'max_requests', p_max_requests,
        'window_minutes', p_window_minutes,
        'violation_severity', CASE 
          WHEN current_count > p_max_requests * 2 THEN 'severe'
          WHEN current_count > p_max_requests * 1.5 THEN 'moderate'
          ELSE 'minor'
        END
      )
    );
    RETURN FALSE;
  END IF;
  
  -- Record this request with enhanced tracking
  INSERT INTO public.access_rate_limits (identifier, endpoint, request_count)
  VALUES (p_identifier, p_endpoint, 1)
  ON CONFLICT (identifier, endpoint) 
  DO UPDATE SET 
    request_count = access_rate_limits.request_count + 1,
    window_start = CASE 
      WHEN access_rate_limits.window_start < now() - (p_window_minutes || ' minutes')::INTERVAL 
      THEN now() 
      ELSE access_rate_limits.window_start 
    END;
  
  RETURN TRUE;
END;
$$;