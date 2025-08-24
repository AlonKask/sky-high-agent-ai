-- Create the missing get_gmail_integration_status RPC function
CREATE OR REPLACE FUNCTION public.get_gmail_integration_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_id_val uuid := auth.uid();
  gmail_email text;
  last_sync timestamp with time zone;
  email_count integer := 0;
BEGIN
  -- Check if user is authenticated
  IF user_id_val IS NULL THEN
    RETURN jsonb_build_object(
      'connected', false,
      'error', 'User not authenticated'
    );
  END IF;
  
  -- Check Gmail credentials
  SELECT gmail_user_email INTO gmail_email
  FROM public.gmail_credentials
  WHERE user_id = user_id_val
  LIMIT 1;
  
  -- Get last sync time from email_exchanges
  SELECT MAX(created_at) INTO last_sync
  FROM public.email_exchanges
  WHERE user_id = user_id_val;
  
  -- Get email count
  SELECT COUNT(*) INTO email_count
  FROM public.email_exchanges
  WHERE user_id = user_id_val;
  
  RETURN jsonb_build_object(
    'connected', gmail_email IS NOT NULL,
    'gmail_user_email', gmail_email,
    'last_sync', last_sync,
    'email_count', email_count
  );
END;
$function$;