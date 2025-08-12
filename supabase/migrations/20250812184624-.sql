-- Retry migration with corrected policy existence checks and validation logic

-- Create security events table if not exists for auditing
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and restrict visibility to admins/managers/supervisors only
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins and managers can view security events' 
      AND schemaname = 'public' 
      AND tablename = 'security_events'
  ) THEN
    CREATE POLICY "Admins and managers can view security events"
    ON public.security_events
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));
  END IF;
END $$;

-- Allow inserting events (typically by service role or RPC) - safe condition
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'System can insert security events' 
      AND schemaname = 'public' 
      AND tablename = 'security_events'
  ) THEN
    CREATE POLICY "System can insert security events"
    ON public.security_events
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Create sensitive data access audit table
CREATE TABLE IF NOT EXISTS public.sensitive_data_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID,
  data_type TEXT NOT NULL,
  access_reason TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sensitive_data_access ENABLE ROW LEVEL SECURITY;

-- Allow inserts by system/edge (RLS bypass with service role) and authenticated users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can log sensitive data access' 
      AND schemaname = 'public' 
      AND tablename = 'sensitive_data_access'
  ) THEN
    CREATE POLICY "Users can log sensitive data access"
    ON public.sensitive_data_access
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Only admins/managers/supervisors can view audit logs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins and managers can view sensitive data access' 
      AND schemaname = 'public' 
      AND tablename = 'sensitive_data_access'
  ) THEN
    CREATE POLICY "Admins and managers can view sensitive data access"
    ON public.sensitive_data_access
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));
  END IF;
END $$;

-- Helper function to validate base64 strings
CREATE OR REPLACE FUNCTION public.is_base64(p_text TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    CASE
      WHEN p_text IS NULL THEN TRUE
      ELSE (p_text ~ '^[A-Za-z0-9+/=\n\r]+$' AND length(p_text) % 4 = 0 AND length(p_text) >= 16)
    END
  );
$$;

-- Trigger function to validate encrypted columns on clients
CREATE OR REPLACE FUNCTION public.validate_clients_encrypted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  payment_text TEXT;
BEGIN
  -- Only validate when values are provided
  IF NEW.encrypted_ssn IS NOT NULL AND NOT public.is_base64(NEW.encrypted_ssn) THEN
    RAISE EXCEPTION 'encrypted_ssn must be base64-encoded ciphertext' USING ERRCODE = '22000';
  END IF;

  IF NEW.encrypted_passport_number IS NOT NULL AND NOT public.is_base64(NEW.encrypted_passport_number) THEN
    RAISE EXCEPTION 'encrypted_passport_number must be base64-encoded ciphertext' USING ERRCODE = '22000';
  END IF;

  -- encrypted_payment_info is jsonb; allow null or base64 string json value or object with key "ciphertext"
  IF NEW.encrypted_payment_info IS NOT NULL THEN
    IF jsonb_typeof(NEW.encrypted_payment_info) = 'string' THEN
      payment_text := trim(both '"' from NEW.encrypted_payment_info::text);
      IF NOT public.is_base64(payment_text) THEN
        RAISE EXCEPTION 'encrypted_payment_info must be base64 string or object with ciphertext' USING ERRCODE = '22000';
      END IF;
    ELSIF jsonb_typeof(NEW.encrypted_payment_info) = 'object' THEN
      IF COALESCE(NEW.encrypted_payment_info->>'ciphertext','') = '' OR NOT public.is_base64(NEW.encrypted_payment_info->>'ciphertext') THEN
        RAISE EXCEPTION 'encrypted_payment_info.ciphertext must be base64-encoded' USING ERRCODE = '22000';
      END IF;
    ELSE
      RAISE EXCEPTION 'encrypted_payment_info must be a base64 string or object' USING ERRCODE = '22000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach validation trigger to clients table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_validate_clients_encrypted'
  ) THEN
    CREATE TRIGGER trg_validate_clients_encrypted
    BEFORE INSERT OR UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.validate_clients_encrypted();
  END IF;
END $$;

-- Audit trigger to record when sensitive columns change
CREATE OR REPLACE FUNCTION public.audit_clients_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  changed_fields TEXT[] := ARRAY[]::TEXT[];
  actor UUID := auth.uid();
BEGIN
  IF NEW.encrypted_ssn IS DISTINCT FROM OLD.encrypted_ssn THEN
    changed_fields := array_append(changed_fields, 'encrypted_ssn');
  END IF;
  IF NEW.encrypted_passport_number IS DISTINCT FROM OLD.encrypted_passport_number THEN
    changed_fields := array_append(changed_fields, 'encrypted_passport_number');
  END IF;
  IF NEW.encrypted_payment_info IS DISTINCT FROM OLD.encrypted_payment_info THEN
    changed_fields := array_append(changed_fields, 'encrypted_payment_info');
  END IF;

  IF array_length(changed_fields, 1) IS NOT NULL THEN
    INSERT INTO public.security_events (user_id, event_type, severity, details)
    VALUES (
      actor,
      'client_sensitive_modified',
      'high',
      jsonb_build_object(
        'client_id', NEW.id,
        'changed_fields', changed_fields,
        'timestamp', now()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_clients_sensitive_changes'
  ) THEN
    CREATE TRIGGER trg_audit_clients_sensitive_changes
    AFTER UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.audit_clients_sensitive_changes();
  END IF;
END $$;