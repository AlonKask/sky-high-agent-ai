
-- 1) Ensure pgcrypto (commonly available on Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Add encrypted token columns (non-breaking)
ALTER TABLE public.gmail_credentials 
  ADD COLUMN IF NOT EXISTS access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted text;

-- 3) Minimal audit table for logging sensitive credential access
CREATE TABLE IF NOT EXISTS public.credential_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accessor_id uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credential_access_audit ENABLE ROW LEVEL SECURITY;

-- Allow inserts from callers (ties log entries to the caller)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'credential_access_audit'
      AND policyname = 'Users/system can insert audit logs'
  ) THEN
    CREATE POLICY "Users/system can insert audit logs"
      ON public.credential_access_audit
      FOR INSERT
      WITH CHECK (
        auth.uid() = accessor_id
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'manager'::app_role)
        OR has_role(auth.uid(), 'supervisor'::app_role)
      );
  END IF;
END$$;

-- Allow viewing only to privileged roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'credential_access_audit'
      AND policyname = 'Privileged can view audit logs'
  ) THEN
    CREATE POLICY "Privileged can view audit logs"
      ON public.credential_access_audit
      FOR SELECT
      USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'manager'::app_role)
        OR has_role(auth.uid(), 'supervisor'::app_role)
      );
  END IF;
END$$;

-- 4) Safe view for frontend (no tokens)
CREATE OR REPLACE VIEW public.gmail_integration_status AS
SELECT
  user_id,
  gmail_user_email,
  updated_at,
  token_expires_at,
  (access_token IS NOT NULL) AS has_access_token,
  (refresh_token IS NOT NULL) AS has_refresh_token,
  CASE
    WHEN token_expires_at IS NULL THEN false
    ELSE (now() AT TIME ZONE 'UTC') > token_expires_at
  END AS token_expired
FROM public.gmail_credentials;

-- Ensure authenticated clients can read the safe view
GRANT SELECT ON public.gmail_integration_status TO authenticated;
