-- Create a simple function to generate OAuth state tokens with enhanced error handling
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  state_token text;
  token_expiry timestamptz;
BEGIN
  -- Clean up expired tokens first
  DELETE FROM public.oauth_state_tokens 
  WHERE expires_at < now() OR user_id = p_user_id;
  
  -- Generate secure random state token (64 hex chars)
  state_token := encode(extensions.gen_random_bytes(32), 'hex');
  
  -- Set expiration to 30 minutes from now
  token_expiry := now() + INTERVAL '30 minutes';
  
  -- Insert the new token
  INSERT INTO public.oauth_state_tokens (
    user_id, 
    state_token, 
    expires_at, 
    used
  ) VALUES (
    p_user_id,
    state_token,
    token_expiry,
    false
  );
  
  -- Log token generation for security monitoring
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    p_user_id,
    'oauth_state_token_generated',
    'low',
    jsonb_build_object(
      'user_id', p_user_id,
      'token_length', length(state_token),
      'expires_at', token_expiry,
      'server_timestamp', now(),
      'client_ip', inet_client_addr(),
      'client_user_agent', current_setting('request.headers', true)::json->>'user-agent'
    )
  );
  
  RETURN state_token;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error for debugging
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    COALESCE(p_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'oauth_token_generation_failed',
    'high',
    jsonb_build_object(
      'error_message', SQLERRM,
      'error_code', SQLSTATE,
      'user_id', p_user_id,
      'timestamp', now()
    )
  );
  
  RAISE EXCEPTION 'Failed to generate OAuth state token: %', SQLERRM;
END;
$$;