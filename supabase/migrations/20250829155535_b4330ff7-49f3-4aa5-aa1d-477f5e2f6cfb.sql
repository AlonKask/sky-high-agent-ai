-- Create a new function that allows public access to option review data for booking
-- This function validates tokens but doesn't mark them as used, allowing multiple accesses
CREATE OR REPLACE FUNCTION public.get_option_review_for_booking(p_client_token text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  client_id uuid,
  request_id uuid,
  quote_ids uuid[],
  client_token text,
  review_status text,
  token_expires_at timestamp with time zone,
  token_used boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate token format (64 hex chars)
  IF p_client_token !~ '^[0-9a-f]{64}$' THEN
    -- Log invalid token attempt
    PERFORM public.log_security_event(
      'invalid_booking_token_format',
      'medium',
      jsonb_build_object('token_format', 'invalid', 'token_length', length(p_client_token))
    );
    RETURN;
  END IF;
  
  -- Check if token exists and is valid (not expired)
  IF NOT EXISTS (
    SELECT 1 FROM public.option_reviews 
    WHERE client_token = p_client_token 
    AND token_expires_at > now()
  ) THEN
    -- Log failed token access
    PERFORM public.log_security_event(
      'booking_token_access_denied',
      'high',
      jsonb_build_object('reason', 'expired_or_not_found', 'timestamp', now())
    );
    RETURN;
  END IF;
  
  -- Log successful access (but don't mark as used)
  PERFORM public.log_security_event(
    'booking_token_accessed',
    'low',
    jsonb_build_object('access_type', 'booking_view', 'timestamp', now())
  );
  
  -- Return the option review data without marking token as used
  RETURN QUERY
  SELECT 
    or_data.id,
    or_data.user_id,
    or_data.client_id,
    or_data.request_id,
    or_data.quote_ids,
    or_data.client_token,
    or_data.review_status,
    or_data.token_expires_at,
    or_data.token_used,
    or_data.created_at,
    or_data.updated_at,
    or_data.metadata
  FROM public.option_reviews or_data
  WHERE or_data.client_token = p_client_token;
END;
$function$;