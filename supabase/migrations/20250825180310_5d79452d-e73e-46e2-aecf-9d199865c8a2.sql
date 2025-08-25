-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS public.log_oauth_operation(uuid,text,boolean,jsonb);
DROP FUNCTION IF EXISTS public.generate_oauth_state_token(uuid);
DROP FUNCTION IF EXISTS public.handle_email_sync_status(uuid,text,timestamp with time zone,integer,text);

-- Function 1: Generate OAuth state tokens
CREATE OR REPLACE FUNCTION public.generate_oauth_state_token(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  state_token text;
BEGIN
  -- Generate secure 64-character token
  state_token := encode(extensions.gen_random_bytes(32), 'hex');
  
  -- Clean up any expired tokens for this user
  DELETE FROM public.oauth_state_tokens 
  WHERE user_id = p_user_id 
  AND expires_at < now();
  
  -- Insert new state token
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
  
  -- Log token generation for security
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    p_user_id,
    'oauth_state_token_generated',
    'low',
    jsonb_build_object(
      'token_length', length(state_token),
      'user_id', p_user_id,
      'server_timestamp', now()
    )
  );
  
  RETURN state_token;
END;
$function$;

-- Function 2: Log OAuth operations for monitoring
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
  -- Log to security events table
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    p_user_id,
    'oauth_operation_' || p_operation,
    CASE 
      WHEN NOT p_success THEN 'high'
      WHEN p_operation IN ('credential_storage', 'token_received') THEN 'medium'
      ELSE 'low'
    END,
    p_details || jsonb_build_object(
      'success', p_success,
      'operation', p_operation,
      'timestamp', now()
    )
  );
END;
$function$;

-- Function 3: Handle email sync status updates
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
AS $function$
BEGIN
  -- Insert or update sync status
  INSERT INTO public.email_sync_status (
    user_id,
    folder_name,
    last_sync_at,
    last_sync_count,
    gmail_history_id,
    created_at,
    updated_at
  ) VALUES (
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