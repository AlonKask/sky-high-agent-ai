-- Create missing RPC functions that are being called by the Gmail integration

-- Simple connectivity test function
CREATE OR REPLACE FUNCTION public.test_function_connectivity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN jsonb_build_object(
    'status', 'connected',
    'timestamp', now(),
    'message', 'Database connectivity confirmed'
  );
END;
$$;

-- Gmail integration status function
CREATE OR REPLACE FUNCTION public.get_gmail_integration_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id_val UUID := auth.uid();
  credential_record RECORD;
  result jsonb;
BEGIN
  -- Check if user is authenticated
  IF user_id_val IS NULL THEN
    RETURN jsonb_build_object(
      'connected', false,
      'error', 'User not authenticated',
      'authenticated_user_id', null
    );
  END IF;
  
  -- Check for Gmail credentials
  SELECT * INTO credential_record
  FROM public.gmail_credentials
  WHERE user_id = user_id_val;
  
  IF FOUND THEN
    result := jsonb_build_object(
      'connected', true,
      'user_email', credential_record.gmail_user_email,
      'last_sync', credential_record.last_sync_at,
      'authenticated_user_id', user_id_val,
      'credentials_found', true
    );
  ELSE
    result := jsonb_build_object(
      'connected', false,
      'user_email', null,
      'last_sync', null,
      'authenticated_user_id', user_id_val,
      'credentials_found', false
    );
  END IF;
  
  RETURN result;
END;
$$;