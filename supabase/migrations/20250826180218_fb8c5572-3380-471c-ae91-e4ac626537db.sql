-- Create or update the handle_email_sync_status function for proper sync status management
CREATE OR REPLACE FUNCTION public.handle_email_sync_status(
  p_user_id uuid,
  p_folder_name text,
  p_last_sync_at timestamp with time zone,
  p_last_sync_count integer DEFAULT 0,
  p_gmail_history_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Upsert sync status (insert or update on conflict)
  INSERT INTO public.email_sync_status (
    user_id,
    folder_name,
    last_sync_at,
    last_sync_count,
    gmail_history_id,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_folder_name,
    p_last_sync_at,
    p_last_sync_count,
    p_gmail_history_id,
    now(),
    now()
  )
  ON CONFLICT (user_id, folder_name)
  DO UPDATE SET
    last_sync_at = EXCLUDED.last_sync_at,
    last_sync_count = EXCLUDED.last_sync_count,
    gmail_history_id = COALESCE(EXCLUDED.gmail_history_id, email_sync_status.gmail_history_id),
    updated_at = now();
END;
$$;

-- Update the decrypt_gmail_token function to handle proper base64 decoding
CREATE OR REPLACE FUNCTION public.decrypt_gmail_token(encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  decrypted_token text;
BEGIN
  -- Check if token is null or empty
  IF encrypted_token IS NULL OR encrypted_token = '' THEN
    RETURN NULL;
  END IF;
  
  -- Validate base64 format before attempting decode
  IF NOT public.is_base64(encrypted_token) THEN
    -- Log the validation failure for debugging
    PERFORM public.log_security_event(
      'token_decode_validation_failed',
      'medium',
      jsonb_build_object(
        'token_length', length(encrypted_token),
        'token_format', 'invalid_base64'
      )
    );
    
    -- If it's not valid base64, it might be corrupted - return null
    RETURN NULL;
  END IF;
  
  BEGIN
    -- Attempt to decode base64 - this is the proper way
    decrypted_token := convert_from(decode(encrypted_token, 'base64'), 'UTF8');
    
    -- Basic validation that we got a reasonable token
    IF length(decrypted_token) < 10 THEN
      RETURN NULL;
    END IF;
    
    RETURN decrypted_token;
  EXCEPTION WHEN OTHERS THEN
    -- Log decode failure for debugging
    PERFORM public.log_security_event(
      'token_decode_failed',
      'medium',
      jsonb_build_object(
        'error', SQLERRM,
        'token_length', length(encrypted_token)
      )
    );
    
    -- Return null on decode failure
    RETURN NULL;
  END;
END;
$$;