-- Drop and recreate the functions to fix the gen_random_bytes issue
DROP FUNCTION IF EXISTS public.validate_oauth_state_token(text);
DROP FUNCTION IF EXISTS public.generate_oauth_state_token();

-- Recreate generate_oauth_state_token with proper extensions.gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token()
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

-- Recreate validate_oauth_state_token 
CREATE OR REPLACE FUNCTION public.validate_oauth_state_token(p_state_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  token_record oauth_state_tokens%ROWTYPE;
BEGIN
  -- Validate token format (64 hex chars)
  IF p_state_token !~ '^[0-9a-f]{64}$' THEN
    RETURN false;
  END IF;
  
  -- Find and validate the token
  SELECT * INTO token_record
  FROM public.oauth_state_tokens
  WHERE state_token = p_state_token
  AND expires_at > now()
  AND used = false;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Mark token as used
  UPDATE public.oauth_state_tokens
  SET used = true
  WHERE id = token_record.id;
  
  RETURN true;
END;
$function$;

-- Clean up any orphaned/expired tokens
DELETE FROM public.oauth_state_tokens 
WHERE expires_at < now() OR used = true;