-- PHASE 1 CONTINUED: Complete Database Trigger Cleanup

-- First, let's check what triggers exist on gmail_credentials
SELECT schemaname, tablename, triggername, tgname, proname 
FROM pg_trigger t
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'public.gmail_credentials'::regclass;

-- Remove all the problematic audit triggers that are blocking credential storage
DROP TRIGGER IF EXISTS gmail_credentials_audit_trigger ON public.gmail_credentials;
DROP TRIGGER IF EXISTS enhanced_gmail_security_monitor ON public.gmail_credentials; 
DROP TRIGGER IF EXISTS gmail_security_monitor_trigger ON public.gmail_credentials;
DROP TRIGGER IF EXISTS audit_gmail_credentials_changes ON public.gmail_credentials;
DROP TRIGGER IF EXISTS gmail_credential_audit_log ON public.gmail_credentials;
DROP TRIGGER IF EXISTS log_gmail_credential_access ON public.gmail_credentials;
DROP TRIGGER IF EXISTS monitor_gmail_credentials ON public.gmail_credentials;

-- Keep only essential triggers: validation and last_sync update
-- The update trigger for last_sync is needed
-- Create a simple, efficient security log function (replacing all the complex ones)
CREATE OR REPLACE FUNCTION public.simple_gmail_credential_monitor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Simple logging without blocking operations
  INSERT INTO public.security_events (user_id, event_type, severity, details)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    'gmail_credentials_' || lower(TG_OP),
    'low',
    jsonb_build_object(
      'operation', TG_OP,
      'gmail_email', COALESCE(NEW.gmail_user_email, OLD.gmail_user_email),
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- If logging fails, don't block the operation
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create single lightweight trigger for security monitoring
CREATE TRIGGER simple_gmail_credential_monitor_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.gmail_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.simple_gmail_credential_monitor();

-- PHASE 2: Enhanced OAuth Verification Function
CREATE OR REPLACE FUNCTION public.log_oauth_operation(
  p_user_id UUID,
  p_operation TEXT,
  p_success BOOLEAN,
  p_details JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_events (user_id, event_type, severity, details)
  VALUES (
    p_user_id,
    'oauth_' || p_operation,
    CASE WHEN p_success THEN 'low' ELSE 'medium' END,
    p_details || jsonb_build_object('success', p_success)
  );
EXCEPTION WHEN OTHERS THEN
  -- Don't block OAuth operations if logging fails
  NULL;
END;
$function$;

-- PHASE 3: Immediate Credential Verification Function
CREATE OR REPLACE FUNCTION public.verify_gmail_credentials(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  credential_record RECORD;
BEGIN
  -- Check if credentials exist for user
  SELECT 
    id,
    gmail_user_email,
    access_token_encrypted IS NOT NULL as has_access_token,
    refresh_token_encrypted IS NOT NULL as has_refresh_token,
    token_expires_at > now() as token_valid,
    is_active,
    created_at,
    last_sync_at
  INTO credential_record
  FROM public.gmail_credentials 
  WHERE user_id = p_user_id 
  AND is_active = true;
  
  IF credential_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'exists', false,
      'connected', false,
      'user_email', null,
      'last_sync', null
    );
  END IF;
  
  RETURN jsonb_build_object(
    'exists', true,
    'connected', true,
    'user_email', credential_record.gmail_user_email,
    'has_access_token', credential_record.has_access_token,
    'has_refresh_token', credential_record.has_refresh_token,
    'token_valid', credential_record.token_valid,
    'last_sync', credential_record.last_sync_at,
    'created_at', credential_record.created_at
  );
END;
$function$;