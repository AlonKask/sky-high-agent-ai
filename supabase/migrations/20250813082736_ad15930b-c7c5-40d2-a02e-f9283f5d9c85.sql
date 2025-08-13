-- Critical Security Fixes Migration - Fixed Dependencies
-- Phase 1: Handle view dependencies and restrict public data access

-- 1. Drop dependent view before removing columns
DROP VIEW IF EXISTS public.gmail_integration_status;

-- 2. Remove plain text OAuth token columns from gmail_credentials
ALTER TABLE public.gmail_credentials 
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS refresh_token;

-- 3. Recreate the view without plain text tokens
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
FROM public.gmail_credentials gc;

-- Enable RLS on the view
ALTER VIEW public.gmail_integration_status SET (security_barrier = true);

-- 4. Update airline_codes RLS policies to require authentication
DROP POLICY IF EXISTS "Authenticated users can view airline codes" ON public.airline_codes;
CREATE POLICY "Authenticated users can view airline codes" 
ON public.airline_codes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 5. Update airport_codes RLS policies to require authentication  
DROP POLICY IF EXISTS "Authenticated users can view airport codes" ON public.airport_codes;
CREATE POLICY "Authenticated users can view airport codes"
ON public.airport_codes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 6. Add trigger to prevent accidental storage of plain text tokens
CREATE OR REPLACE FUNCTION public.validate_gmail_credentials_security()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_gmail_credentials_trigger ON public.gmail_credentials;
CREATE TRIGGER validate_gmail_credentials_trigger
  BEFORE INSERT OR UPDATE ON public.gmail_credentials
  FOR EACH ROW EXECUTE FUNCTION public.validate_gmail_credentials_security();

-- 7. Enhance option_reviews with secure token generation
CREATE OR REPLACE FUNCTION public.generate_secure_client_token()
RETURNS TEXT AS $$
BEGIN
  -- Generate cryptographically secure 64-character hex token
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add token expiration to option_reviews
ALTER TABLE public.option_reviews 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
ADD COLUMN IF NOT EXISTS token_used BOOLEAN DEFAULT FALSE;

-- 9. Update option_reviews token generation to use secure tokens
CREATE OR REPLACE FUNCTION public.secure_option_review_token()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS secure_option_review_token_trigger ON public.option_reviews;
CREATE TRIGGER secure_option_review_token_trigger
  BEFORE INSERT ON public.option_reviews
  FOR EACH ROW EXECUTE FUNCTION public.secure_option_review_token();

-- 10. Enhanced get_option_reviews_by_token function with security checks
CREATE OR REPLACE FUNCTION public.get_option_reviews_by_token(p_client_token text)
RETURNS SETOF option_reviews
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate token format (64 hex chars)
  IF p_client_token !~ '^[0-9a-f]{64}$' THEN
    -- Log invalid token attempt
    PERFORM public.log_security_event(
      'invalid_option_token_attempt',
      'medium',
      jsonb_build_object('token_format', 'invalid', 'token_length', length(p_client_token))
    );
    RETURN;
  END IF;
  
  -- Check if token exists and is valid
  IF NOT EXISTS (
    SELECT 1 FROM public.option_reviews 
    WHERE client_token = p_client_token 
    AND token_expires_at > now() 
    AND token_used = FALSE
  ) THEN
    -- Log failed token access
    PERFORM public.log_security_event(
      'option_token_access_denied',
      'high',
      jsonb_build_object('reason', 'expired_or_used', 'timestamp', now())
    );
    RETURN;
  END IF;
  
  -- Mark token as used and return data
  UPDATE public.option_reviews 
  SET token_used = TRUE 
  WHERE client_token = p_client_token;
  
  -- Log successful access
  PERFORM public.log_security_event(
    'option_token_accessed',
    'low',
    jsonb_build_object('timestamp', now())
  );
  
  RETURN QUERY
  SELECT * FROM public.option_reviews 
  WHERE client_token = p_client_token;
END;
$$;

-- 11. Add rate limiting table
CREATE TABLE IF NOT EXISTS public.access_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or token
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

ALTER TABLE public.access_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits"
ON public.access_rate_limits
FOR ALL
USING (true);

-- 12. Rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;