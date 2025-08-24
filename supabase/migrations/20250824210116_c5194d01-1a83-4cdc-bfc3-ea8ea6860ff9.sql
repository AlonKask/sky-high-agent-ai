-- Fix generate_oauth_state_token to use correct schema qualification for gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  state_token text;
BEGIN
  -- Generate secure random token using extensions.gen_random_bytes
  state_token := encode(extensions.gen_random_bytes(32), 'hex');
  
  -- Store token with expiration
  INSERT INTO public.oauth_state_tokens (user_id, state_token, expires_at)
  VALUES (p_user_id, state_token, now() + interval '10 minutes')
  ON CONFLICT (user_id) DO UPDATE SET
    state_token = EXCLUDED.state_token,
    expires_at = EXCLUDED.expires_at,
    used = false,
    created_at = now();
  
  RETURN state_token;
END;
$$;