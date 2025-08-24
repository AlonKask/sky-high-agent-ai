-- Phase 1: Fix State Token Validation - Improve logging and extend expiry

-- First, update the oauth_state_tokens table to extend expiry to 30 minutes
ALTER TABLE public.oauth_state_tokens 
ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '30 minutes');

-- Create enhanced state token generation function with better logging
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  state_token text;
BEGIN
  -- Validate user_id parameter first
  IF p_user_id IS NULL THEN
    PERFORM public.log_security_event(
      'oauth_token_generation_failed',
      'high',
      jsonb_build_object('reason', 'null_user_id')
    );
    RAISE EXCEPTION 'User ID cannot be null' USING ERRCODE = '22000';
  END IF;

  -- Generate cryptographically secure 64-character hex token
  state_token := encode(gen_random_bytes(32), 'hex');
  
  -- Log token generation for debugging
  PERFORM public.log_security_event(
    'oauth_state_token_generated',
    'low',
    jsonb_build_object(
      'user_id', p_user_id,
      'token_length', length(state_token),
      'expires_in_minutes', 30
    )
  );
  
  -- Clean up any existing expired tokens for this user
  DELETE FROM public.oauth_state_tokens 
  WHERE user_id = p_user_id AND (expires_at < now() OR used = true);
  
  -- Insert new token
  INSERT INTO public.oauth_state_tokens (user_id, state_token, expires_at, used)
  VALUES (p_user_id, state_token, now() + INTERVAL '30 minutes', false);
  
  RETURN state_token;
END;
$$;

-- Enhanced state token validation function with comprehensive logging
CREATE OR REPLACE FUNCTION public.validate_oauth_state_token(p_state_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_user_id uuid;
  token_record RECORD;
BEGIN
  -- Log validation attempt
  PERFORM public.log_security_event(
    'oauth_state_validation_attempt',
    'low',
    jsonb_build_object(
      'token_provided', p_state_token IS NOT NULL,
      'token_length', COALESCE(length(p_state_token), 0),
      'timestamp', now()
    )
  );

  -- Validate input
  IF p_state_token IS NULL OR p_state_token = '' THEN
    PERFORM public.log_security_event(
      'oauth_state_validation_failed',
      'high',
      jsonb_build_object('reason', 'empty_token')
    );
    RAISE EXCEPTION 'State token cannot be empty' USING ERRCODE = '22000';
  END IF;

  -- Check token format (should be 64 hex characters)
  IF length(p_state_token) != 64 OR p_state_token !~ '^[0-9a-f]+$' THEN
    PERFORM public.log_security_event(
      'oauth_state_validation_failed',
      'high',
      jsonb_build_object(
        'reason', 'invalid_token_format',
        'token_length', length(p_state_token),
        'token_pattern_valid', p_state_token ~ '^[0-9a-f]+$'
      )
    );
    RAISE EXCEPTION 'Invalid state token format' USING ERRCODE = '22000';
  END IF;

  -- Get token record with detailed info
  SELECT * INTO token_record
  FROM public.oauth_state_tokens 
  WHERE state_token = p_state_token;

  -- Log detailed token lookup result
  IF token_record IS NULL THEN
    PERFORM public.log_security_event(
      'oauth_state_validation_failed',
      'high',
      jsonb_build_object(
        'reason', 'token_not_found',
        'searched_token', p_state_token
      )
    );
    RAISE EXCEPTION 'OAuth state token not found' USING ERRCODE = '42501';
  END IF;

  -- Check if token is already used
  IF token_record.used = true THEN
    PERFORM public.log_security_event(
      'oauth_state_validation_failed',
      'high',
      jsonb_build_object(
        'reason', 'token_already_used',
        'user_id', token_record.user_id,
        'token_created', token_record.created_at
      )
    );
    RAISE EXCEPTION 'OAuth state token already used' USING ERRCODE = '42501';
  END IF;

  -- Check if token is expired
  IF token_record.expires_at < now() THEN
    PERFORM public.log_security_event(
      'oauth_state_validation_failed',
      'high',
      jsonb_build_object(
        'reason', 'token_expired',
        'user_id', token_record.user_id,
        'expired_at', token_record.expires_at,
        'current_time', now(),
        'minutes_expired', EXTRACT(EPOCH FROM (now() - token_record.expires_at))/60
      )
    );
    RAISE EXCEPTION 'OAuth state token expired' USING ERRCODE = '42501';
  END IF;

  -- Mark token as used
  UPDATE public.oauth_state_tokens 
  SET used = true
  WHERE state_token = p_state_token;

  -- Log successful validation
  PERFORM public.log_security_event(
    'oauth_state_validation_success',
    'low',
    jsonb_build_object(
      'user_id', token_record.user_id,
      'token_age_minutes', EXTRACT(EPOCH FROM (now() - token_record.created_at))/60,
      'validation_successful', true
    )
  );

  RETURN token_record.user_id;
END;
$$;

-- Enhanced gmail credentials validation with better error handling
CREATE OR REPLACE FUNCTION public.validate_gmail_credentials_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate user_id is not null and is valid UUID
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null' USING ERRCODE = '22000';
  END IF;

  -- Validate encrypted tokens
  IF NEW.access_token_encrypted IS NULL THEN
    RAISE EXCEPTION 'access_token_encrypted cannot be null' USING ERRCODE = '22000';
  END IF;

  -- Validate email format
  IF NEW.gmail_user_email IS NULL OR NEW.gmail_user_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Invalid gmail_user_email format' USING ERRCODE = '22000';
  END IF;

  -- Log credential storage attempt
  PERFORM public.log_security_event(
    'gmail_credentials_stored',
    'medium',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'gmail_email', NEW.gmail_user_email,
      'has_refresh_token', NEW.refresh_token_encrypted IS NOT NULL,
      'operation', TG_OP
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for gmail credentials validation
DROP TRIGGER IF EXISTS gmail_credentials_validation_trigger ON public.gmail_credentials;
CREATE TRIGGER gmail_credentials_validation_trigger
  BEFORE INSERT OR UPDATE ON public.gmail_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_gmail_credentials_storage();

-- Add cleanup function for expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.oauth_state_tokens 
  WHERE expires_at < now() OR used = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  PERFORM public.log_security_event(
    'oauth_tokens_cleanup',
    'low',
    jsonb_build_object(
      'deleted_count', deleted_count,
      'cleanup_timestamp', now()
    )
  );
END;
$$;