-- Fix the ambiguous column reference in get_option_review_for_booking function
DROP FUNCTION IF EXISTS public.get_option_review_for_booking(text);

CREATE OR REPLACE FUNCTION public.get_option_review_for_booking(p_client_token text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  client_id uuid,
  request_id uuid,
  quote_ids uuid[],
  client_token text,
  token_expires_at timestamp with time zone,
  token_used boolean,
  review_status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  metadata jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate token format (64 hex chars)
  IF p_client_token !~ '^[0-9a-f]{64}$' THEN
    PERFORM public.log_security_event(
      'invalid_option_token_attempt',
      'medium',
      jsonb_build_object('token_format', 'invalid', 'token_length', length(p_client_token))
    );
    RETURN;
  END IF;
  
  -- Check if token exists and is valid (but don't mark as used for viewing)
  IF NOT EXISTS (
    SELECT 1 FROM public.option_reviews 
    WHERE option_reviews.client_token = p_client_token 
    AND token_expires_at > now() 
  ) THEN
    PERFORM public.log_security_event(
      'option_token_access_denied',
      'high',
      jsonb_build_object('reason', 'expired_or_invalid', 'timestamp', now())
    );
    RETURN;
  END IF;
  
  -- Log successful access (viewing only)
  PERFORM public.log_security_event(
    'option_token_viewed',
    'low',
    jsonb_build_object('timestamp', now())
  );
  
  -- Return data without marking token as used
  RETURN QUERY
  SELECT 
    or_.id,
    or_.user_id,
    or_.client_id,
    or_.request_id,
    or_.quote_ids,
    or_.client_token,
    or_.token_expires_at,
    or_.token_used,
    or_.review_status,
    or_.created_at,
    or_.updated_at,
    or_.metadata
  FROM public.option_reviews or_
  WHERE or_.client_token = p_client_token;
END;
$$;