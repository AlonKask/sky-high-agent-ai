-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vault;

-- Add encrypted columns if missing
ALTER TABLE public.gmail_credentials 
  ADD COLUMN IF NOT EXISTS access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted text;

-- Trigger function to encrypt tokens on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_gmail_tokens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  BEGIN
    IF NEW.access_token IS NOT NULL THEN
      NEW.access_token_encrypted := encode(
        pgp_sym_encrypt(NEW.access_token::bytea, vault.decrypted_secret('GMAIL_CREDENTIALS_KEY')),
        'base64'
      );
    END IF;
    IF NEW.refresh_token IS NOT NULL THEN
      NEW.refresh_token_encrypted := encode(
        pgp_sym_encrypt(NEW.refresh_token::bytea, vault.decrypted_secret('GMAIL_CREDENTIALS_KEY')),
        'base64'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log encryption failure but do not block write; tokens will remain unencrypted until secret is set
    PERFORM public.log_security_event('encryption_failed', 'high', jsonb_build_object('table','gmail_credentials','error', SQLERRM));
  END;
  RETURN NEW;
END;
$$;

-- Attach triggers
DROP TRIGGER IF EXISTS encrypt_gmail_tokens_before_ins ON public.gmail_credentials;
CREATE TRIGGER encrypt_gmail_tokens_before_ins
BEFORE INSERT ON public.gmail_credentials
FOR EACH ROW EXECUTE FUNCTION public.encrypt_gmail_tokens();

DROP TRIGGER IF EXISTS encrypt_gmail_tokens_before_upd ON public.gmail_credentials;
CREATE TRIGGER encrypt_gmail_tokens_before_upd
BEFORE UPDATE OF access_token, refresh_token ON public.gmail_credentials
FOR EACH ROW EXECUTE FUNCTION public.encrypt_gmail_tokens();

-- Backfill encryption for existing rows (best-effort)
DO $$
BEGIN
  BEGIN
    UPDATE public.gmail_credentials
    SET 
      access_token_encrypted = CASE 
        WHEN access_token IS NOT NULL THEN encode(pgp_sym_encrypt(access_token::bytea, vault.decrypted_secret('GMAIL_CREDENTIALS_KEY')),'base64')
        ELSE access_token_encrypted
      END,
      refresh_token_encrypted = CASE 
        WHEN refresh_token IS NOT NULL THEN encode(pgp_sym_encrypt(refresh_token::bytea, vault.decrypted_secret('GMAIL_CREDENTIALS_KEY')),'base64')
        ELSE refresh_token_encrypted
      END
    WHERE (access_token IS NOT NULL AND access_token_encrypted IS NULL)
       OR (refresh_token IS NOT NULL AND refresh_token_encrypted IS NULL);
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.log_security_event('encryption_backfill_skipped', 'medium', jsonb_build_object('table','gmail_credentials','error', SQLERRM));
  END;
END$$;

-- Restrict plaintext token column visibility to block exfiltration via API
REVOKE SELECT (access_token, refresh_token) ON public.gmail_credentials FROM anon;
REVOKE SELECT (access_token, refresh_token) ON public.gmail_credentials FROM authenticated;

-- Secure decryption RPC with audit logging
CREATE OR REPLACE FUNCTION public.get_gmail_credentials_decrypted(p_user_id uuid)
RETURNS TABLE(
  access_token text,
  refresh_token text,
  gmail_user_email text,
  token_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Log access attempt
  PERFORM public.log_security_event(
    'gmail_credentials_access',
    'high',
    jsonb_build_object('user_id', p_user_id, 'timestamp', now(), 'ip', inet_client_addr())
  );

  RETURN QUERY
  SELECT 
    CASE WHEN gc.access_token_encrypted IS NOT NULL THEN 
      convert_from(pgp_sym_decrypt(decode(gc.access_token_encrypted,'base64'), vault.decrypted_secret('GMAIL_CREDENTIALS_KEY')), 'utf8')
    ELSE NULL END AS access_token,
    CASE WHEN gc.refresh_token_encrypted IS NOT NULL THEN 
      convert_from(pgp_sym_decrypt(decode(gc.refresh_token_encrypted,'base64'), vault.decrypted_secret('GMAIL_CREDENTIALS_KEY')), 'utf8')
    ELSE NULL END AS refresh_token,
    gc.gmail_user_email,
    gc.token_expires_at
  FROM public.gmail_credentials gc
  WHERE gc.user_id = p_user_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_gmail_credentials_decrypted(uuid) TO authenticated;