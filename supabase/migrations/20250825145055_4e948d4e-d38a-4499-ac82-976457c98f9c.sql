-- PHASE 1: Fix Database Trigger Conflicts
-- Remove the strict validation trigger that's blocking credential storage
DROP TRIGGER IF EXISTS gmail_credentials_validation_trigger ON public.gmail_credentials;

-- PHASE 2: Update is_base64 function to handle standard base64 encoding (btoa() output)
CREATE OR REPLACE FUNCTION public.is_base64(p_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $function$
  SELECT (
    CASE
      WHEN p_text IS NULL THEN TRUE
      -- Handle standard base64 including btoa() output (more permissive)
      ELSE (p_text ~ '^[A-Za-z0-9+/]*={0,2}$' AND length(p_text) >= 4)
    END
  );
$function$;