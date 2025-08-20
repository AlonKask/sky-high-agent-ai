-- Enhanced security event logging function with better error handling
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text DEFAULT 'medium'::text,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_user_id uuid;
  final_details jsonb;
BEGIN
  -- Get current user ID (can be null for anonymous events)
  event_user_id := auth.uid();
  
  -- Validate severity level
  IF p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    p_severity := 'medium';
  END IF;
  
  -- Validate and sanitize event type (prevent injection)
  IF p_event_type IS NULL OR length(trim(p_event_type)) = 0 THEN
    RETURN false;
  END IF;
  
  -- Sanitize event type to prevent malicious content
  p_event_type := trim(regexp_replace(p_event_type, '[^a-zA-Z0-9_\-\.]', '', 'g'));
  
  -- Build final details with metadata
  final_details := COALESCE(p_details, '{}'::jsonb) || jsonb_build_object(
    'logged_at', now(),
    'session_authenticated', (event_user_id IS NOT NULL),
    'event_source', 'client_application'
  );
  
  -- Insert security event with conflict handling
  BEGIN
    INSERT INTO public.security_events (
      user_id,
      event_type,
      severity,
      details,
      timestamp
    ) VALUES (
      event_user_id,
      p_event_type,
      p_severity::text,
      final_details,
      now()
    );
    
    RETURN true;
    
  EXCEPTION 
    WHEN check_violation THEN
      -- Handle constraint violations gracefully
      INSERT INTO public.security_events (
        user_id,
        event_type,
        severity,
        details,
        timestamp
      ) VALUES (
        event_user_id,
        'security_logging_error',
        'high',
        jsonb_build_object(
          'original_event_type', p_event_type,
          'original_severity', p_severity,
          'error', 'constraint_violation',
          'logged_at', now()
        ),
        now()
      );
      RETURN false;
      
    WHEN OTHERS THEN
      -- Log any other errors
      INSERT INTO public.security_events (
        user_id,
        event_type,
        severity,
        details,
        timestamp
      ) VALUES (
        event_user_id,
        'security_logging_error',
        'high',
        jsonb_build_object(
          'original_event_type', p_event_type,
          'error', SQLERRM,
          'logged_at', now()
        ),
        now()
      );
      RETURN false;
  END;
END;
$$;

-- Enhanced rate limiting for edge functions
CREATE OR REPLACE FUNCTION public.check_edge_function_rate_limit(
  p_function_name text,
  p_identifier text,
  p_max_requests integer DEFAULT 100,
  p_window_minutes integer DEFAULT 15
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_count integer;
  window_start timestamp;
BEGIN
  -- Calculate window start time
  window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Count recent requests for this identifier and function
  SELECT COUNT(*)
  INTO request_count
  FROM public.security_events
  WHERE event_type = 'edge_function_call'
  AND details->>'function_name' = p_function_name
  AND details->>'identifier' = p_identifier
  AND timestamp > window_start;
  
  -- Check if limit exceeded
  IF request_count >= p_max_requests THEN
    -- Log rate limit violation
    PERFORM public.log_security_event(
      'edge_function_rate_limit_exceeded',
      'high',
      jsonb_build_object(
        'function_name', p_function_name,
        'identifier', p_identifier,
        'request_count', request_count,
        'limit', p_max_requests,
        'window_minutes', p_window_minutes
      )
    );
    
    RETURN false;
  END IF;
  
  -- Log successful function call
  PERFORM public.log_security_event(
    'edge_function_call',
    'low',
    jsonb_build_object(
      'function_name', p_function_name,
      'identifier', p_identifier,
      'request_count', request_count + 1
    )
  );
  
  RETURN true;
END;
$$;