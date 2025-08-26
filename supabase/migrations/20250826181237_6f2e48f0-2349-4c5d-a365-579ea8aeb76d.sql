-- Clean up duplicate handle_email_sync_status functions and create single authoritative version
DROP FUNCTION IF EXISTS public.handle_email_sync_status(uuid,text,timestamp with time zone,integer);
DROP FUNCTION IF EXISTS public.handle_email_sync_status(uuid,text,timestamp with time zone,integer,text);

-- Create single authoritative handle_email_sync_status function
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
SET search_path = 'public'
AS $function$
BEGIN
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
$function$;

-- Create decrypt_gmail_token function if it doesn't exist (improved version)
CREATE OR REPLACE FUNCTION public.decrypt_gmail_token(encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Simple base64 decode for tokens stored with btoa()
  BEGIN
    RETURN convert_from(decode(encrypted_token, 'base64'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    -- Log the decryption failure but don't expose details
    PERFORM public.log_security_event(
      'token_decryption_failed',
      'high',
      jsonb_build_object(
        'error_code', SQLSTATE,
        'token_length', length(encrypted_token),
        'user_id', auth.uid()
      )
    );
    RETURN NULL;
  END;
END;
$function$;