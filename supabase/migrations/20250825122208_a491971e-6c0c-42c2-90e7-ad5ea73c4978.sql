-- Drop and recreate validate_oauth_state_token function with correct return type
DROP FUNCTION IF EXISTS public.validate_oauth_state_token(text);

CREATE OR REPLACE FUNCTION public.validate_oauth_state_token(p_state_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  token_user_id uuid;
BEGIN
  -- Validate token format (64 hex chars)
  IF p_state_token !~ '^[0-9a-f]{64}$' THEN
    PERFORM public.log_security_event(
      'invalid_oauth_state_token',
      'high',
      jsonb_build_object('token_format', 'invalid', 'token_length', length(p_state_token))
    );
    RETURN NULL;
  END IF;
  
  -- Check if token exists, is valid, and not used
  SELECT user_id INTO token_user_id
  FROM public.oauth_state_tokens 
  WHERE state_token = p_state_token 
  AND expires_at > now() 
  AND used = false;
  
  IF token_user_id IS NULL THEN
    PERFORM public.log_security_event(
      'oauth_state_token_validation_failed',
      'high',
      jsonb_build_object('reason', 'expired_or_used_or_not_found', 'timestamp', now())
    );
    RETURN NULL;
  END IF;
  
  -- Mark token as used
  UPDATE public.oauth_state_tokens 
  SET used = true, updated_at = now()
  WHERE state_token = p_state_token;
  
  -- Log successful validation
  PERFORM public.log_security_event(
    'oauth_state_token_validated',
    'low',
    jsonb_build_object('user_id', token_user_id, 'timestamp', now())
  );
  
  RETURN token_user_id;
END;
$function$;