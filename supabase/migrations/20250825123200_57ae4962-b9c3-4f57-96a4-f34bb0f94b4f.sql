-- Fix token generation functions to use correct gen_random_bytes

-- Drop and recreate generate_oauth_state_token function if it exists
DROP FUNCTION IF EXISTS public.generate_oauth_state_token(uuid);

-- Create the correct generate_oauth_state_token function
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  state_token text;
BEGIN
  -- Generate cryptographically secure 64-character hex token
  state_token := encode(extensions.gen_random_bytes(32), 'hex');
  
  -- Store the token with expiration
  INSERT INTO public.oauth_state_tokens (user_id, state_token, expires_at)
  VALUES (p_user_id, state_token, now() + INTERVAL '30 minutes');
  
  -- Log token generation for security
  PERFORM public.log_security_event(
    'oauth_state_token_generated',
    'low',
    jsonb_build_object(
      'user_id', p_user_id,
      'token_length', length(state_token)
    )
  );
  
  RETURN state_token;
END;
$function$;

-- Fix generate_secure_client_token function
CREATE OR REPLACE FUNCTION public.generate_secure_client_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Generate cryptographically secure 64-character hex token using extensions schema
  RETURN encode(extensions.gen_random_bytes(32), 'hex');
END;
$function$;