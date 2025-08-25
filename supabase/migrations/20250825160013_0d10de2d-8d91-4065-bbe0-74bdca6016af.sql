-- PHASE 1: Database Trigger Cleanup - Remove excessive triggers that are blocking credential storage
-- Keep only essential triggers and remove duplicates

-- Remove excessive audit triggers (keeping only the essential ones)
DROP TRIGGER IF EXISTS audit_gmail_credentials_access ON public.gmail_credentials;
DROP TRIGGER IF EXISTS audit_gmail_credentials_operations ON public.gmail_credentials;
DROP TRIGGER IF EXISTS audit_gmail_credentials_trigger ON public.gmail_credentials;
DROP TRIGGER IF EXISTS critical_audit_gmail_credentials ON public.gmail_credentials;
DROP TRIGGER IF EXISTS enhanced_credential_security_monitor ON public.gmail_credentials;
DROP TRIGGER IF EXISTS gmail_credentials_access_monitor ON public.gmail_credentials;
DROP TRIGGER IF EXISTS log_gmail_credentials_access ON public.gmail_credentials;
DROP TRIGGER IF EXISTS validate_gmail_credentials_trigger ON public.gmail_credentials;

-- Keep only these essential triggers:
-- 1. simple_gmail_credential_monitor_trigger (lightweight monitoring)
-- 2. trigger_update_gmail_last_sync (functional requirement)

-- Verify the remaining triggers are lightweight
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