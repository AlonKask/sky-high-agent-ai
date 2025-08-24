-- Fix Gmail integration RPC functions with proper authentication and error handling

-- 1. Create/Replace get_gmail_integration_status function
CREATE OR REPLACE FUNCTION public.get_gmail_integration_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id_val uuid;
  gmail_creds record;
  result jsonb;
BEGIN
  -- Get authenticated user ID
  user_id_val := auth.uid();
  
  -- Check if user is authenticated
  IF user_id_val IS NULL THEN
    RETURN jsonb_build_object(
      'connected', false,
      'error', 'User not authenticated',
      'authenticated_user_id', null,
      'debug_info', jsonb_build_object(
        'auth_uid', auth.uid(),
        'current_role', current_setting('role'),
        'session_user', session_user
      )
    );
  END IF;
  
  -- Check for existing Gmail credentials
  SELECT * INTO gmail_creds
  FROM public.gmail_credentials
  WHERE user_id = user_id_val;
  
  IF FOUND THEN
    result := jsonb_build_object(
      'connected', true,
      'user_email', gmail_creds.gmail_user_email,
      'last_sync', gmail_creds.last_sync_at,
      'authenticated_user_id', user_id_val,
      'token_expires_at', gmail_creds.token_expires_at
    );
  ELSE
    result := jsonb_build_object(
      'connected', false,
      'user_email', null,
      'last_sync', null,
      'authenticated_user_id', user_id_val,
      'message', 'No Gmail credentials found'
    );
  END IF;
  
  -- Log the access for security monitoring
  PERFORM public.log_security_event(
    'gmail_status_check',
    'low',
    jsonb_build_object(
      'user_id', user_id_val,
      'connected', (result->>'connected')::boolean,
      'timestamp', now()
    )
  );
  
  RETURN result;
END;
$$;

-- 2. Create/Replace generate_oauth_state_token function
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  state_token text;
BEGIN
  -- Generate secure random token
  state_token := encode(gen_random_bytes(32), 'hex');
  
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

-- 3. Create/Replace validate_oauth_state_token function
CREATE OR REPLACE FUNCTION public.validate_oauth_state_token(p_state_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_user_id uuid;
BEGIN
  -- Validate and mark token as used
  UPDATE public.oauth_state_tokens 
  SET used = true
  WHERE state_token = p_state_token 
    AND expires_at > now() 
    AND used = false
  RETURNING user_id INTO token_user_id;
  
  IF token_user_id IS NULL THEN
    -- Log security event for invalid token
    PERFORM public.log_security_event(
      'invalid_oauth_state_token',
      'high',
      jsonb_build_object('state_token', p_state_token)
    );
    RAISE EXCEPTION 'Invalid or expired OAuth state token' USING ERRCODE = '42501';
  END IF;
  
  RETURN token_user_id;
END;
$$;