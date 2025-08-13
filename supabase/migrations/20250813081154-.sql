-- Critical Security Fixes Migration (Fixed)

-- 1. Remove or secure clients_public view (it exposes all client data without RLS)
DROP VIEW IF EXISTS public.clients_public;

-- 2. Create OAuth state validation table for secure OAuth flows
CREATE TABLE IF NOT EXISTS public.oauth_state_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  state_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '10 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on oauth_state_tokens
ALTER TABLE public.oauth_state_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for oauth_state_tokens
CREATE POLICY "System can manage oauth state tokens"
ON public.oauth_state_tokens
FOR ALL
USING (true);

-- Add cleanup function for expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.oauth_state_tokens 
  WHERE expires_at < now() OR used = true;
END;
$$;

-- 3. Create function to generate and validate OAuth state tokens
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  state_token text;
BEGIN
  -- Generate cryptographically secure random token
  state_token := encode(gen_random_bytes(32), 'hex');
  
  -- Clean up old tokens for this user
  DELETE FROM public.oauth_state_tokens 
  WHERE user_id = p_user_id AND (expires_at < now() OR used = true);
  
  -- Insert new token
  INSERT INTO public.oauth_state_tokens (user_id, state_token)
  VALUES (p_user_id, state_token);
  
  RETURN state_token;
END;
$$;

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