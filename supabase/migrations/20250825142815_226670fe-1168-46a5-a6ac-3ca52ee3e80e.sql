-- PHASE 1: DATABASE FOUNDATION - Gmail Integration Fixes
-- Create lightweight validation function that doesn't fail
CREATE OR REPLACE FUNCTION public.is_valid_token_format(token_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $function$
BEGIN
  -- Simple validation - allow null or reasonable length base64-like strings
  IF token_text IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check reasonable length (not too short, not too long)
  IF length(token_text) < 10 OR length(token_text) > 4000 THEN
    RETURN false;
  END IF;
  
  -- Check basic base64-like pattern (letters, numbers, +, /, =)
  IF token_text ~ '^[A-Za-z0-9+/=\._-]+$' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- Create audit function for Gmail credentials operations
CREATE OR REPLACE FUNCTION public.log_gmail_credential_event(
  p_user_id uuid,
  p_event_type text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert audit record with error handling
  BEGIN
    INSERT INTO public.security_events (
      user_id,
      event_type,
      severity,
      details
    ) VALUES (
      p_user_id,
      'gmail_' || p_event_type,
      'medium',
      p_details || jsonb_build_object(
        'timestamp', now(),
        'function', 'log_gmail_credential_event'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Don't let logging failures break the main operation
    NULL;
  END;
END;
$function$;

-- Create lightweight validation trigger for gmail_credentials
CREATE OR REPLACE FUNCTION public.validate_gmail_credentials_lightweight()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log the credential operation for monitoring
  PERFORM public.log_gmail_credential_event(
    NEW.user_id,
    'credential_' || lower(TG_OP),
    jsonb_build_object(
      'gmail_email', NEW.gmail_user_email,
      'has_access_token', (NEW.access_token_encrypted IS NOT NULL),
      'has_refresh_token', (NEW.refresh_token_encrypted IS NOT NULL),
      'expires_at', NEW.expires_at
    )
  );

  -- Validate token formats (warn but don't block)
  IF NEW.access_token_encrypted IS NOT NULL AND NOT public.is_valid_token_format(NEW.access_token_encrypted) THEN
    PERFORM public.log_gmail_credential_event(
      NEW.user_id,
      'invalid_access_token_format',
      jsonb_build_object('token_length', length(NEW.access_token_encrypted))
    );
  END IF;

  IF NEW.refresh_token_encrypted IS NOT NULL AND NOT public.is_valid_token_format(NEW.refresh_token_encrypted) THEN
    PERFORM public.log_gmail_credential_event(
      NEW.user_id,
      'invalid_refresh_token_format', 
      jsonb_build_object('token_length', length(NEW.refresh_token_encrypted))
    );
  END IF;

  -- Always allow the operation to proceed
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS validate_gmail_credentials_trigger ON public.gmail_credentials;
CREATE TRIGGER validate_gmail_credentials_trigger
  BEFORE INSERT OR UPDATE ON public.gmail_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_gmail_credentials_lightweight();

-- Fix RLS policies for gmail_credentials to allow service role operations
DROP POLICY IF EXISTS "gmail_credentials_user_access_policy" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Users can manage their Gmail credentials" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Service role can manage Gmail credentials" ON public.gmail_credentials;

-- Create comprehensive RLS policy for gmail_credentials
CREATE POLICY "gmail_credentials_secure_access" ON public.gmail_credentials
  FOR ALL USING (
    -- Service role can always access (for OAuth callbacks)
    current_setting('role') = 'service_role'
    OR 
    -- Users can only access their own credentials
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  )
  WITH CHECK (
    -- Service role can always insert/update (for OAuth callbacks)  
    current_setting('role') = 'service_role'
    OR
    -- Users can only modify their own credentials
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

-- Create audit function for OAuth operations
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
  BEGIN
    INSERT INTO public.security_events (
      user_id,
      event_type, 
      severity,
      details
    ) VALUES (
      p_user_id,
      'oauth_' || p_operation,
      CASE WHEN p_success THEN 'low' ELSE 'high' END,
      p_details || jsonb_build_object(
        'success', p_success,
        'timestamp', now(),
        'operation', p_operation
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Don't let logging failures break OAuth
    NULL;
  END;
END;
$function$;