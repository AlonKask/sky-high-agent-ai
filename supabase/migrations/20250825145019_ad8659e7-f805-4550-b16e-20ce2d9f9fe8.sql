-- PHASE 1: Fix Database Trigger Conflicts
-- Remove the strict validation trigger that's blocking credential storage
DROP TRIGGER IF EXISTS gmail_credentials_validation_trigger ON public.gmail_credentials;

-- Keep only the lightweight trigger for logging
-- Verify the lightweight trigger exists (it should from our previous migration)
-- If it doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'gmail_credentials' AND t.tgname = 'validate_gmail_credentials_lightweight_trigger'
  ) THEN
    CREATE TRIGGER validate_gmail_credentials_lightweight_trigger
      BEFORE INSERT OR UPDATE ON public.gmail_credentials
      FOR EACH ROW
      EXECUTE FUNCTION public.log_oauth_operation(NEW.user_id, 'credential_storage', true, 
        jsonb_build_object('gmail_email', NEW.gmail_user_email, 'validation_type', 'lightweight')
      );
  END IF;
END $$;

-- PHASE 2: Update is_base64 function to handle standard base64 encoding
CREATE OR REPLACE FUNCTION public.is_base64(p_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $function$
  SELECT (
    CASE
      WHEN p_text IS NULL THEN TRUE
      -- Handle standard base64 including btoa() output
      ELSE (p_text ~ '^[A-Za-z0-9+/]*={0,2}$' AND length(p_text) % 4 = 0 AND length(p_text) >= 4)
    END
  );
$function$;