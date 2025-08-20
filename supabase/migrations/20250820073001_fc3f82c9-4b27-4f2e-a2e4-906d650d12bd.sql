-- Phase 1: Critical Security Fixes - Drop and recreate functions

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.check_advanced_rate_limit(text, text, integer, integer);

-- 1. Create enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_advanced_rate_limit(
  p_identifier text,
  p_action text,
  p_max_requests integer DEFAULT 5,
  p_window_seconds integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start timestamp;
BEGIN
  window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  -- Count recent requests
  SELECT COUNT(*) INTO current_count
  FROM security_events
  WHERE details->>'identifier' = p_identifier
    AND details->>'action' = p_action
    AND timestamp > window_start;
  
  -- Log rate limit check
  INSERT INTO security_events (event_type, severity, details)
  VALUES (
    'rate_limit_check',
    CASE WHEN current_count >= p_max_requests THEN 'high' ELSE 'low' END,
    jsonb_build_object(
      'identifier', p_identifier,
      'action', p_action,
      'current_count', current_count,
      'max_requests', p_max_requests,
      'blocked', current_count >= p_max_requests
    )
  );
  
  RETURN current_count < p_max_requests;
END;
$$;

-- 2. Enhanced client data access trigger
CREATE OR REPLACE TRIGGER ensure_client_data_encryption_audit
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_clients_encrypted();

-- 3. Add security monitoring trigger to clients table  
CREATE OR REPLACE TRIGGER audit_client_sensitive_operations
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_client_operations();

-- 4. Enhanced Gmail credentials security
CREATE OR REPLACE TRIGGER validate_gmail_credentials_trigger
  BEFORE INSERT OR UPDATE ON public.gmail_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_gmail_credentials_security();

-- 5. Secure option review token generation
CREATE OR REPLACE TRIGGER generate_option_review_token
  BEFORE INSERT ON public.option_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.secure_option_review_token();

-- 6. Add email sync status upsert trigger
CREATE OR REPLACE TRIGGER email_sync_status_upsert
  BEFORE INSERT ON public.email_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION public.email_sync_status_upsert_trigger();

-- 7. Prevent token storage in user preferences
CREATE OR REPLACE TRIGGER block_token_storage_in_preferences
  BEFORE INSERT OR UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_no_tokens_in_user_preferences();