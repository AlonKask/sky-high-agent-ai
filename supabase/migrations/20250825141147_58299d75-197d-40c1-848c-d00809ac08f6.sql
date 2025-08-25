-- PHASE 1: FIX DATABASE VALIDATION CRITICAL ISSUES

-- First, let's improve the base64 validation function to handle Google OAuth tokens properly
CREATE OR REPLACE FUNCTION public.is_base64_flexible(p_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $function$
  SELECT (
    CASE
      WHEN p_text IS NULL THEN TRUE
      WHEN length(p_text) < 16 THEN FALSE
      -- Allow more flexible base64 patterns for OAuth tokens
      WHEN p_text ~ '^[A-Za-z0-9+/._-]+={0,2}$' THEN TRUE
      -- Also allow URL-safe base64
      WHEN p_text ~ '^[A-Za-z0-9_-]+={0,2}$' THEN TRUE
      ELSE FALSE
    END
  );
$function$;

-- Enhanced Gmail credentials validation with comprehensive logging
CREATE OR REPLACE FUNCTION public.validate_gmail_credentials_security_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  validation_errors text[] := '{}';
  error_details jsonb := '{}';
BEGIN
  -- Log the validation attempt
  PERFORM public.log_security_event(
    'gmail_credential_validation_start',
    'low',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'gmail_email', NEW.gmail_user_email,
      'has_access_token', (NEW.access_token_encrypted IS NOT NULL),
      'has_refresh_token', (NEW.refresh_token_encrypted IS NOT NULL),
      'access_token_length', COALESCE(length(NEW.access_token_encrypted), 0),
      'refresh_token_length', COALESCE(length(NEW.refresh_token_encrypted), 0)
    )
  );

  -- Validate encrypted access token with flexible validation
  IF NEW.access_token_encrypted IS NOT NULL THEN
    IF NOT public.is_base64_flexible(NEW.access_token_encrypted) THEN
      validation_errors := array_append(validation_errors, 'access_token_format_invalid');
      error_details := error_details || jsonb_build_object(
        'access_token_sample', left(NEW.access_token_encrypted, 20) || '...'
      );
    END IF;
  END IF;

  -- Validate encrypted refresh token with flexible validation  
  IF NEW.refresh_token_encrypted IS NOT NULL THEN
    IF NOT public.is_base64_flexible(NEW.refresh_token_encrypted) THEN
      validation_errors := array_append(validation_errors, 'refresh_token_format_invalid');
      error_details := error_details || jsonb_build_object(
        'refresh_token_sample', left(NEW.refresh_token_encrypted, 20) || '...'
      );
    END IF;
  END IF;

  -- If there are validation errors, log them and raise exception
  IF array_length(validation_errors, 1) > 0 THEN
    PERFORM public.log_security_event(
      'gmail_credential_validation_failed',
      'high',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'gmail_email', NEW.gmail_user_email,
        'validation_errors', validation_errors,
        'error_details', error_details,
        'access_token_length', COALESCE(length(NEW.access_token_encrypted), 0),
        'refresh_token_length', COALESCE(length(NEW.refresh_token_encrypted), 0)
      )
    );
    
    RAISE EXCEPTION 'Gmail credential validation failed: %', array_to_string(validation_errors, ', ') 
      USING ERRCODE = '22000', 
            DETAIL = error_details::text;
  END IF;

  -- Log successful validation
  PERFORM public.log_security_event(
    'gmail_credential_validation_success',
    'low',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'gmail_email', NEW.gmail_user_email,
      'tokens_validated', true
    )
  );

  RETURN NEW;
END;
$function$;

-- Replace the existing validation trigger with the enhanced one
DROP TRIGGER IF EXISTS validate_gmail_credentials_trigger ON public.gmail_credentials;
CREATE TRIGGER validate_gmail_credentials_trigger
  BEFORE INSERT OR UPDATE ON public.gmail_credentials
  FOR EACH ROW EXECUTE FUNCTION public.validate_gmail_credentials_security_enhanced();

-- Add comprehensive audit logging for Gmail credentials operations
CREATE OR REPLACE FUNCTION public.audit_gmail_credentials_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log all Gmail credential operations for debugging
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event(
      'gmail_credential_insert_attempt',
      'medium',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'gmail_email', NEW.gmail_user_email,
        'is_active', NEW.is_active,
        'token_expires_at', NEW.token_expires_at,
        'operation', 'INSERT',
        'timestamp', now()
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event(
      'gmail_credential_update_attempt',
      'medium',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'gmail_email', NEW.gmail_user_email,
        'old_is_active', OLD.is_active,
        'new_is_active', NEW.is_active,
        'operation', 'UPDATE',
        'timestamp', now()
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Add audit trigger for Gmail credentials
DROP TRIGGER IF EXISTS audit_gmail_credentials_trigger ON public.gmail_credentials;
CREATE TRIGGER audit_gmail_credentials_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.gmail_credentials
  FOR EACH ROW EXECUTE FUNCTION public.audit_gmail_credentials_operations();