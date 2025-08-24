-- Phase 1: Fix OAuth credential storage by allowing service role to bypass RLS for OAuth operations
-- This is secure because the oauth-callback validates the state token which contains the user_id

-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "BULLETPROOF_gmail_credentials_security" ON public.gmail_credentials;

-- Create new policies that allow both user access and service role OAuth operations
CREATE POLICY "users_can_access_own_gmail_credentials" 
ON public.gmail_credentials 
FOR ALL 
USING (auth.uid() = user_id);

-- Allow service role to manage credentials for OAuth callback operations
-- This is secure because the OAuth callback validates the state token
CREATE POLICY "service_role_oauth_operations" 
ON public.gmail_credentials 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Add function to safely get Gmail credentials with proper authentication
CREATE OR REPLACE FUNCTION public.get_gmail_integration_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  
  -- Log the access attempt for security monitoring
  PERFORM public.log_security_event(
    'gmail_status_check',
    'low',
    jsonb_build_object(
      'user_id', user_id_val,
      'timestamp', now()
    )
  );
  
  -- Check for Gmail credentials
  SELECT * INTO credential_record
  FROM public.gmail_credentials
  WHERE user_id = user_id_val 
    AND is_active = true;
  
  IF FOUND THEN
    result := jsonb_build_object(
      'connected', true,
      'user_email', credential_record.gmail_user_email,
      'last_sync', credential_record.last_sync_at,
      'authenticated_user_id', user_id_val,
      'credentials_found', true,
      'token_expires_at', credential_record.token_expires_at
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