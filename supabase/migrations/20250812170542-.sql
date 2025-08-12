-- Create audit table for credential access/encryption events (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'credential_access_audit'
  ) THEN
    CREATE TABLE public.credential_access_audit (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      accessor_id UUID NOT NULL,
      action TEXT NOT NULL,
      details JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.credential_access_audit ENABLE ROW LEVEL SECURITY;

-- Policies (create only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'credential_access_audit' AND policyname = 'Users can view their own credential access logs'
  ) THEN
    CREATE POLICY "Users can view their own credential access logs"
    ON public.credential_access_audit
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'credential_access_audit' AND policyname = 'Admins can view all credential access logs'
  ) THEN
    CREATE POLICY "Admins can view all credential access logs"
    ON public.credential_access_audit
    FOR SELECT
    USING (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'manager'::app_role) OR
      has_role(auth.uid(), 'supervisor'::app_role)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'credential_access_audit' AND policyname = 'Users (or system) can insert own audit entries'
  ) THEN
    CREATE POLICY "Users (or system) can insert own audit entries"
    ON public.credential_access_audit
    FOR INSERT
    WITH CHECK (auth.uid() = accessor_id);
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_credential_access_audit_user_id ON public.credential_access_audit (user_id);
CREATE INDEX IF NOT EXISTS idx_credential_access_audit_accessor_id ON public.credential_access_audit (accessor_id);
CREATE INDEX IF NOT EXISTS idx_credential_access_audit_created_at ON public.credential_access_audit (created_at);

-- Safe status view for frontend (no tokens exposed)
CREATE OR REPLACE VIEW public.gmail_integration_status AS
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
FROM public.gmail_credentials gc;