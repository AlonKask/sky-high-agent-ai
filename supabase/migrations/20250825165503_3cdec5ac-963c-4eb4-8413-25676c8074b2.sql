-- Fix Gmail OAuth Callback Issue by adding missing RPC functions
-- These functions are required by the gmail-oauth Edge Function

-- Function to log OAuth operations for monitoring
CREATE OR REPLACE FUNCTION public.log_oauth_operation(
  p_user_id uuid,
  p_operation text,
  p_success boolean DEFAULT true,
  p_details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log OAuth operations to security_events for monitoring
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    p_user_id,
    'gmail_oauth_' || p_operation,
    CASE 
      WHEN p_success THEN 'low'
      ELSE 'high'
    END,
    p_details || jsonb_build_object(
      'success', p_success,
      'operation', p_operation,
      'timestamp', now()
    )
  );
END;
$$;

-- Function to generate OAuth state tokens
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  state_token text;
BEGIN
  -- Generate a secure random token
  state_token := encode(extensions.gen_random_bytes(32), 'hex');
  
  -- Clean up expired tokens first
  DELETE FROM public.oauth_state_tokens 
  WHERE expires_at < now() OR used = true;
  
  -- Store the token
  INSERT INTO public.oauth_state_tokens (
    user_id,
    state_token,
    expires_at
  ) VALUES (
    p_user_id,
    state_token,
    now() + INTERVAL '30 minutes'
  );
  
  RETURN state_token;
END;
$$;

-- Function to validate OAuth state tokens
CREATE OR REPLACE FUNCTION public.validate_oauth_state_token(p_state_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_user_id uuid;
BEGIN
  -- Get and mark token as used
  UPDATE public.oauth_state_tokens 
  SET used = true
  WHERE state_token = p_state_token
    AND expires_at > now()
    AND used = false
  RETURNING user_id INTO token_user_id;
  
  IF token_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired OAuth state token';
  END IF;
  
  RETURN token_user_id;
END;
$$;