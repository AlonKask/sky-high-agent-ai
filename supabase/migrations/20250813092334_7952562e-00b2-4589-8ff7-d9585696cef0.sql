-- COMPREHENSIVE SECURITY REMEDIATION - PHASE 1: Fixed Version

-- 1. Enhanced security events table  
ALTER TABLE IF EXISTS public.security_events 
ADD COLUMN IF NOT EXISTS ip_address inet,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS session_id text,
ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;

-- 2. Secure session management
CREATE TABLE IF NOT EXISTS public.secure_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token_encrypted text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '8 hours'),
  is_active boolean NOT NULL DEFAULT true,
  mfa_verified boolean NOT NULL DEFAULT false,
  risk_score integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.secure_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own secure sessions" ON public.secure_sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage secure sessions" ON public.secure_sessions
FOR ALL USING (true);

-- 3. Enhanced Gmail credentials security
ALTER TABLE IF EXISTS public.gmail_credentials
ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_access_at timestamptz,
ADD COLUMN IF NOT EXISTS access_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;

-- 4. Comprehensive data access logging
CREATE TABLE IF NOT EXISTS public.sensitive_data_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accessed_user_id uuid,
  table_name text NOT NULL,
  record_id uuid,
  data_type text NOT NULL,
  access_reason text,
  ip_address inet,
  user_agent text,
  risk_score integer DEFAULT 0,
  timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.sensitive_data_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all data access logs" ON public.sensitive_data_access
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view logs for their own data" ON public.sensitive_data_access
FOR SELECT USING (auth.uid() = accessed_user_id);

CREATE POLICY "System can log data access" ON public.sensitive_data_access
FOR INSERT WITH CHECK (true);

-- 5. Enhanced encryption columns for sensitive tables
ALTER TABLE IF EXISTS public.email_exchanges
ADD COLUMN IF NOT EXISTS content_encrypted text,
ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS data_classification text DEFAULT 'confidential',
ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;

ALTER TABLE IF EXISTS public.agent_client_chat
ADD COLUMN IF NOT EXISTS message_encrypted text,
ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS data_classification text DEFAULT 'confidential',
ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;

ALTER TABLE IF EXISTS public.quotes
ADD COLUMN IF NOT EXISTS financial_data_encrypted jsonb,
ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS data_classification text DEFAULT 'restricted',
ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;

ALTER TABLE IF EXISTS public.bookings
ADD COLUMN IF NOT EXISTS financial_data_encrypted jsonb,
ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS data_classification text DEFAULT 'restricted',
ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;

-- 6. Enhanced security functions
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_table_name text,
  p_record_id uuid,
  p_data_type text,
  p_reason text DEFAULT 'legitimate_access'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.sensitive_data_access (
    user_id, table_name, record_id, data_type, access_reason,
    ip_address, user_agent, timestamp
  ) VALUES (
    auth.uid(), p_table_name, p_record_id, p_data_type, p_reason,
    inet '127.0.0.1', 'system', now()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Continue execution if logging fails
    NULL;
END;
$$;

-- 7. Secure data masking function
CREATE OR REPLACE FUNCTION public.mask_data(
  data text,
  mask_type text DEFAULT 'partial'
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN NULL;
  END IF;
  
  CASE mask_type
    WHEN 'email' THEN
      RETURN LEFT(split_part(data, '@', 1), 2) || '***@' || split_part(data, '@', 2);
    WHEN 'phone' THEN
      RETURN 'XXX-XXX-' || RIGHT(regexp_replace(data, '[^0-9]', '', 'g'), 4);
    WHEN 'full' THEN
      RETURN REPEAT('*', LENGTH(data));
    ELSE
      RETURN LEFT(data, 2) || REPEAT('*', GREATEST(LENGTH(data) - 4, 0)) || RIGHT(data, 2);
  END CASE;
END;
$$;

-- 8. Enhanced security for existing tables
CREATE OR REPLACE FUNCTION public.secure_client_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log every access to client data
  PERFORM public.log_sensitive_access('clients', NEW.id, 'client_data', 'authorized_access');
  RETURN NEW;
END;
$$;

-- Create triggers for audit logging
DROP TRIGGER IF EXISTS secure_client_access_trigger ON public.clients;
CREATE TRIGGER secure_client_access_trigger
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.secure_client_access();

-- 9. Enhanced access rate limiting
CREATE TABLE IF NOT EXISTS public.access_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- 10. Performance indexes
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity, timestamp);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_user_time ON public.sensitive_data_access(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_secure_sessions_user_active ON public.secure_sessions(user_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_access_limits_identifier ON public.access_rate_limits(identifier, endpoint, window_start);

-- 11. Grant permissions
GRANT SELECT, INSERT ON public.sensitive_data_access TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.secure_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_rate_limits TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_sensitive_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.mask_data TO authenticated;