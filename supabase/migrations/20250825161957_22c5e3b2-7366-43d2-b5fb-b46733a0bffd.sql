-- PHASE 1: Create missing database functions for OAuth infrastructure

-- Function to generate secure OAuth state tokens
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  state_token text;
BEGIN
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

-- Function to validate OAuth state tokens
CREATE OR REPLACE FUNCTION public.validate_oauth_state_token(p_state_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  token_user_id uuid;
BEGIN
  -- Find and validate the state token
  SELECT user_id INTO token_user_id
  FROM public.oauth_state_tokens
  WHERE state_token = p_state_token
    AND expires_at > now()
    AND used = false;
  
  IF token_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired state token';
  END IF;
  
  -- Mark token as used
  UPDATE public.oauth_state_tokens
  SET used = true
  WHERE state_token = p_state_token;
  
  RETURN token_user_id;
END;
$function$;

-- Function to log OAuth operations for monitoring
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
    CASE WHEN p_success THEN 'low' ELSE 'medium' END,
    jsonb_build_object(
      'operation', p_operation,
      'success', p_success,
      'timestamp', now()
    ) || p_details
  );
END;
$function$;

-- Function to handle email sync status upserts
CREATE OR REPLACE FUNCTION public.handle_email_sync_status(
  p_user_id uuid,
  p_folder_name text,
  p_last_sync_at timestamp with time zone,
  p_last_sync_count integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.email_sync_status (
    user_id,
    folder_name,
    last_sync_at,
    last_sync_count,
    updated_at
  ) VALUES (
    p_user_id,
    p_folder_name,
    p_last_sync_at,
    p_last_sync_count,
    now()
  )
  ON CONFLICT (user_id, folder_name)
  DO UPDATE SET
    last_sync_at = p_last_sync_at,
    last_sync_count = p_last_sync_count,
    updated_at = now();
END;
$function$;