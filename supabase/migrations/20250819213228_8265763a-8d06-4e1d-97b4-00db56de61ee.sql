-- Fix the check_rate_limit function - it was calling log_security_event with wrong severity
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
    -- Log rate limit violation with correct severity
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      'high',
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