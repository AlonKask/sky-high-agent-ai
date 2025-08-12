-- Harden gmail_integration_status to prevent enumeration
CREATE OR REPLACE VIEW public.gmail_integration_status
WITH (security_invoker = on)
AS
SELECT 
  gc.user_id,
  gc.gmail_user_email,
  gc.updated_at,
  gc.token_expires_at,
  (gc.access_token IS NOT NULL OR gc.access_token_encrypted IS NOT NULL) AS has_access_token,
  (gc.refresh_token IS NOT NULL OR gc.refresh_token_encrypted IS NOT NULL) AS has_refresh_token,
  CASE 
    WHEN gc.token_expires_at IS NULL THEN NULL
    ELSE (gc.token_expires_at <= now())
  END AS token_expired
FROM public.gmail_credentials gc
WHERE gc.user_id = auth.uid();