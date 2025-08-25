-- PHASE 1: Fix OAuth state tokens table constraint to allow multiple tokens per user
-- Drop the unique constraint that's causing the duplicate key errors
ALTER TABLE public.oauth_state_tokens DROP CONSTRAINT IF EXISTS oauth_state_tokens_user_id_unique;

-- Add a proper cleanup mechanism for expired/used tokens
CREATE OR REPLACE FUNCTION public.cleanup_oauth_state_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete expired or used tokens
  DELETE FROM public.oauth_state_tokens 
  WHERE expires_at < now() 
     OR used = true;
     
  -- Also delete very old tokens (older than 1 hour)
  DELETE FROM public.oauth_state_tokens
  WHERE created_at < now() - INTERVAL '1 hour';
END;
$function$;

-- Update the generate_oauth_state_token function to cleanup before creating
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  state_token text;
BEGIN
  -- Cleanup any existing tokens for this user first
  DELETE FROM public.oauth_state_tokens 
  WHERE user_id = p_user_id 
    AND (expires_at < now() OR used = true OR created_at < now() - INTERVAL '30 minutes');
  
  -- Generate cryptographically secure token
  state_token := encode(extensions.gen_random_bytes(32), 'hex');
  
  -- Store state token with expiration (30 minutes)
  INSERT INTO public.oauth_state_tokens (
    user_id,
    state_token,
    expires_at,
    created_at
  ) VALUES (
    p_user_id,
    state_token,
    now() + INTERVAL '30 minutes',
    now()
  );
  
  RETURN state_token;
END;
$function$;

-- Create index for better performance on cleanup operations
CREATE INDEX IF NOT EXISTS idx_oauth_state_tokens_cleanup 
ON public.oauth_state_tokens (user_id, expires_at, used, created_at);