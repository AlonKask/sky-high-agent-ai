-- Step 1: Ensure pgcrypto is available for future encryption tasks
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Add encrypted columns to store tokens at rest (to be populated by a secure process)
ALTER TABLE public.gmail_credentials 
  ADD COLUMN IF NOT EXISTS access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted text;

-- Step 3: Prevent plaintext token exfiltration for frontend roles
REVOKE SELECT (access_token, refresh_token) ON public.gmail_credentials FROM anon;
REVOKE SELECT (access_token, refresh_token) ON public.gmail_credentials FROM authenticated;

-- Note: Service role access remains unaffected; existing edge functions will continue to work.
-- A dedicated edge function will populate encrypted columns and (optionally) rotate/null plaintext after verification.

-- Optional hardening: keep existing RLS; no policy changes required here since column privileges handle exposure.
