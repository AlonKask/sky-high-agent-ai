CREATE OR REPLACE FUNCTION public.get_gmail_integration_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_id_val uuid;
  gmail_record record;
  result jsonb;
BEGIN
  -- Get authenticated user ID
  user_id_val := auth.uid();
  
  -- Return unauthenticated status if no user
  IF user_id_val IS NULL THEN
    RETURN jsonb_build_object(
      'connected', false,
      'error', 'User not authenticated',
      'user_email', null,
      'last_sync', null
    );
  END IF;
  
  -- Check for Gmail credentials
  SELECT 
    gmail_user_email,
    last_sync_at,
    is_active
  INTO gmail_record
  FROM public.gmail_credentials
  WHERE user_id = user_id_val
  AND is_active = true;
  
  -- Build result based on credentials
  IF FOUND THEN
    result := jsonb_build_object(
      'connected', true,
      'user_email', gmail_record.gmail_user_email,
      'last_sync', gmail_record.last_sync_at,
      'authenticated_user_id', user_id_val
    );
  ELSE
    result := jsonb_build_object(
      'connected', false,
      'user_email', null,
      'last_sync', null,
      'authenticated_user_id', user_id_val
    );
  END IF;
  
  -- Log the status check for debugging
  PERFORM public.log_security_event(
    'gmail_status_checked',
    'low',
    jsonb_build_object(
      'user_id', user_id_val,
      'gmail_connected', (gmail_record.gmail_user_email IS NOT NULL),
      'function_called_successfully', true
    )
  );
  
  RETURN result;
END;
$function$