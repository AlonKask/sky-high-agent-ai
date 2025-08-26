-- Create function to generate OAuth state tokens
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  state_token text;
BEGIN
  -- Generate cryptographically secure state token
  state_token := encode(extensions.gen_random_bytes(32), 'hex');
  
  -- Insert state token with expiration
  INSERT INTO public.oauth_state_tokens (user_id, state_token, expires_at, used)
  VALUES (
    p_user_id,
    state_token,
    now() + INTERVAL '30 minutes',
    false
  );
  
  -- Log token generation
  PERFORM public.log_security_event(
    'oauth_state_token_generated',
    'low',
    jsonb_build_object(
      'user_id', p_user_id,
      'token_length', length(state_token),
      'expires_at', now() + INTERVAL '30 minutes'
    )
  );
  
  RETURN state_token;
END;
$function$;

-- Create function to log OAuth operations
CREATE OR REPLACE FUNCTION public.log_oauth_operation(
  p_user_id uuid,
  p_operation text,
  p_success boolean,
  p_details jsonb DEFAULT '{}'::jsonb
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    p_user_id,
    'oauth_' || p_operation,
    CASE WHEN p_success THEN 'low' ELSE 'high' END,
    p_details || jsonb_build_object(
      'operation', p_operation,
      'success', p_success,
      'timestamp', now()
    )
  );
END;
$function$;