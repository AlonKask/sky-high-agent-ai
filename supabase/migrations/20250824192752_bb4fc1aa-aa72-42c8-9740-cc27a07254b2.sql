-- Phase 1: Fix RPC Authentication Issues
-- Drop all existing conflicting get_gmail_integration_status functions
DROP FUNCTION IF EXISTS public.get_gmail_integration_status();
DROP FUNCTION IF EXISTS public.get_gmail_integration_status(uuid);

-- Create a single, properly working RPC function for Gmail integration status
CREATE OR REPLACE FUNCTION public.get_gmail_integration_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id_val uuid := auth.uid();
  gmail_email text;
  last_sync timestamp with time zone;
  email_count integer := 0;
  has_credentials boolean := false;
BEGIN
  -- Debug logging
  RAISE LOG 'get_gmail_integration_status called for user: %', user_id_val;
  
  -- Check if user is authenticated
  IF user_id_val IS NULL THEN
    RAISE LOG 'User not authenticated in get_gmail_integration_status';
    RETURN jsonb_build_object(
      'connected', false,
      'error', 'User not authenticated'
    );
  END IF;
  
  -- Check Gmail credentials exist
  SELECT gmail_user_email INTO gmail_email
  FROM public.gmail_credentials
  WHERE user_id = user_id_val
  AND access_token_encrypted IS NOT NULL
  LIMIT 1;
  
  has_credentials := gmail_email IS NOT NULL;
  
  -- Get last sync time from email_exchanges
  SELECT MAX(created_at) INTO last_sync
  FROM public.email_exchanges
  WHERE user_id = user_id_val;
  
  -- Get email count
  SELECT COUNT(*) INTO email_count
  FROM public.email_exchanges
  WHERE user_id = user_id_val;
  
  RAISE LOG 'Gmail integration status for user %: connected=%, email=%, count=%', 
    user_id_val, has_credentials, gmail_email, email_count;
  
  RETURN jsonb_build_object(
    'connected', has_credentials,
    'gmail_user_email', gmail_email,
    'last_sync', last_sync,
    'email_count', email_count
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_gmail_integration_status() TO authenticated;