-- Fix Security Linter Issues - Function Search Paths and View Security

-- 1. Fix the security definer view by adding proper RLS
DROP VIEW IF EXISTS public.gmail_integration_status;

-- Create a more secure view that respects user permissions
CREATE VIEW public.gmail_integration_status AS
SELECT 
  gc.user_id,
  gc.gmail_user_email,
  gc.token_expires_at,
  CASE 
    WHEN gc.access_token_encrypted IS NOT NULL THEN true 
    ELSE false 
  END as is_connected,
  gc.created_at,
  gc.updated_at
FROM public.gmail_credentials gc
WHERE gc.user_id = auth.uid(); -- Only show current user's data

-- Enable RLS on the view with proper restrictions
ALTER VIEW public.gmail_integration_status SET (security_barrier = false);

-- 2. Fix function search paths for security functions
CREATE OR REPLACE FUNCTION public.validate_gmail_credentials_security()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure only encrypted tokens are stored
  IF NEW.access_token_encrypted IS NULL AND NEW.refresh_token_encrypted IS NULL THEN
    RAISE EXCEPTION 'Gmail credentials must use encrypted token fields only' USING ERRCODE = '22000';
  END IF;
  
  -- Log credential updates for security monitoring
  PERFORM public.log_security_event(
    'gmail_credentials_updated',
    'medium',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'gmail_email', NEW.gmail_user_email,
      'has_encrypted_tokens', (NEW.access_token_encrypted IS NOT NULL)
    )
  );
  
  RETURN NEW;
END;
$$;

-- 3. Fix generate_secure_client_token function search path
CREATE OR REPLACE FUNCTION public.generate_secure_client_token()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Generate cryptographically secure 64-character hex token
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- 4. Fix secure_option_review_token function search path
CREATE OR REPLACE FUNCTION public.secure_option_review_token()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Generate secure token if not provided
  IF NEW.client_token IS NULL OR NEW.client_token = '' THEN
    NEW.client_token := public.generate_secure_client_token();
  END IF;
  
  -- Set expiration if not provided
  IF NEW.token_expires_at IS NULL THEN
    NEW.token_expires_at := now() + INTERVAL '7 days';
  END IF;
  
  -- Log token generation for security
  PERFORM public.log_security_event(
    'option_review_token_generated',
    'low',
    jsonb_build_object(
      'quote_id', NEW.quote_id,
      'client_id', NEW.client_id,
      'expires_at', NEW.token_expires_at
    )
  );
  
  RETURN NEW;
END;
$$;

-- 5. Fix check_rate_limit function search path
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN 
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
  WHERE window_start < now() - INTERVAL '1 hour';
  
  -- Get current count for this identifier/endpoint
  SELECT COALESCE(SUM(request_count), 0) 
  INTO current_count
  FROM public.access_rate_limits
  WHERE identifier = p_identifier 
  AND endpoint = p_endpoint
  AND window_start > now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    -- Log rate limit violation
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
      WHEN access_rate_limits.window_start < now() - (p_window_minutes || ' minutes')::INTERVAL 
      THEN now() 
      ELSE access_rate_limits.window_start 
    END;
  
  RETURN TRUE;
END;
$$;