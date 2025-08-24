-- Create missing RPC functions for Gmail integration

-- Test function connectivity
CREATE OR REPLACE FUNCTION public.test_function_connectivity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Simple connectivity test
  RETURN jsonb_build_object(
    'status', 'connected',
    'timestamp', now(),
    'database', 'online'
  );
END;
$function$;

-- Get Gmail integration status for authenticated user
CREATE OR REPLACE FUNCTION public.get_gmail_integration_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_id_param uuid := auth.uid();
  gmail_record record;
BEGIN
  -- Deny if not authenticated
  IF user_id_param IS NULL THEN
    RETURN jsonb_build_object(
      'connected', false,
      'error', 'User not authenticated'
    );
  END IF;
  
  -- Check Gmail credentials for the authenticated user
  SELECT * INTO gmail_record
  FROM public.gmail_credentials
  WHERE user_id = user_id_param;
  
  IF gmail_record IS NULL THEN
    -- No Gmail credentials found
    RETURN jsonb_build_object(
      'connected', false,
      'user_email', null,
      'last_sync', null,
      'authenticated_user_id', user_id_param
    );
  END IF;
  
  -- Check if tokens are valid (not expired)
  IF gmail_record.token_expires_at < now() THEN
    RETURN jsonb_build_object(
      'connected', false,
      'user_email', gmail_record.gmail_user_email,
      'last_sync', gmail_record.last_sync_at,
      'error', 'Token expired',
      'authenticated_user_id', user_id_param
    );
  END IF;
  
  -- Return connected status
  RETURN jsonb_build_object(
    'connected', true,
    'user_email', gmail_record.gmail_user_email,
    'last_sync', gmail_record.last_sync_at,
    'authenticated_user_id', user_id_param
  );
END;
$function$;