-- Fix the generate_oauth_state_token function to use properly qualified gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  state_token text;
BEGIN
  -- Generate cryptographically secure random token using properly qualified function
  state_token := encode(extensions.gen_random_bytes(32), 'hex');
  
  -- Clean up old tokens for this user
  DELETE FROM public.oauth_state_tokens 
  WHERE user_id = p_user_id AND (expires_at < now() OR used = true);
  
  -- Insert new token
  INSERT INTO public.oauth_state_tokens (user_id, state_token)
  VALUES (p_user_id, state_token);
  
  RETURN state_token;
END;
$function$