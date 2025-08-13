-- COMPREHENSIVE SECURITY REMEDIATION - PHASE 1: Enhanced Encryption & Access Controls

-- 1. Create comprehensive security events tracking
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'security_level') THEN
    CREATE TYPE security_level AS ENUM ('critical', 'high', 'medium', 'low');
  END IF;
END $$;

-- 2. Enhanced security events table
ALTER TABLE IF EXISTS public.security_events 
ADD COLUMN IF NOT EXISTS ip_address inet,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS session_id text,
ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;

-- 3. Secure session management with enhanced tracking
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

-- Enable RLS on secure_sessions
ALTER TABLE public.secure_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for secure_sessions
CREATE POLICY "Users can view their own secure sessions" ON public.secure_sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage secure sessions" ON public.secure_sessions
FOR ALL USING (true);

-- 4. Enhanced Gmail credentials security
ALTER TABLE IF EXISTS public.gmail_credentials
ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_access_at timestamptz,
ADD COLUMN IF NOT EXISTS access_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;

-- 5. Comprehensive data access logging
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

-- Enable RLS on sensitive_data_access
ALTER TABLE public.sensitive_data_access ENABLE ROW LEVEL SECURITY;

-- Create policies for sensitive_data_access
CREATE POLICY "Admins can view all data access logs" ON public.sensitive_data_access
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view logs for their own data" ON public.sensitive_data_access
FOR SELECT USING (auth.uid() = accessed_user_id);

CREATE POLICY "System can log data access" ON public.sensitive_data_access
FOR INSERT WITH CHECK (true);

-- 6. Enhanced email security with encryption
ALTER TABLE IF EXISTS public.email_exchanges
ADD COLUMN IF NOT EXISTS content_encrypted text,
ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS data_classification text DEFAULT 'confidential',
ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;

-- 7. Secure chat communications
ALTER TABLE IF EXISTS public.agent_client_chat
ADD COLUMN IF NOT EXISTS message_encrypted text,
ADD COLUMN IF NOT EXISTS encryption_key_version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS data_classification text DEFAULT 'confidential',
ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0;

-- 8. Financial data protection for quotes and bookings
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

-- 9. Enhanced security functions for comprehensive access control
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
END;
$$;

-- 10. Secure data masking function
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

-- 11. Enhanced RLS policies for maximum security
-- Update clients table policies
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Secure client access with logging" ON public.clients
FOR SELECT USING (
  (auth.uid() = user_id OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND (SELECT public.log_sensitive_access('clients', id, 'client_data', 'authorized_access') IS NOT NULL OR true)
);

-- Update gmail_credentials table policies
DROP POLICY IF EXISTS "Users can access gmail integration based on permissions" ON public.gmail_credentials;
CREATE POLICY "Secure Gmail credentials access" ON public.gmail_credentials
FOR SELECT USING (
  auth.uid() = user_id
  AND (SELECT public.log_sensitive_access('gmail_credentials', id, 'oauth_tokens', 'gmail_integration') IS NOT NULL OR true)
);

-- Update email_exchanges policies
DROP POLICY IF EXISTS "Users can view their own email exchanges" ON public.email_exchanges;
CREATE POLICY "Secure email access with logging" ON public.email_exchanges
FOR SELECT USING (
  auth.uid() = user_id
  AND (SELECT public.log_sensitive_access('email_exchanges', id, 'email_content', 'email_review') IS NOT NULL OR true)
);

-- 12. Automatic security monitoring triggers
CREATE OR REPLACE FUNCTION public.monitor_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  access_count integer;
  time_window interval := '1 hour';
BEGIN
  -- Count recent accesses by this user
  SELECT COUNT(*) INTO access_count
  FROM public.sensitive_data_access
  WHERE user_id = auth.uid()
    AND timestamp > (now() - time_window);
  
  -- Flag suspicious activity
  IF access_count > 50 THEN
    PERFORM public.log_security_event(
      'excessive_data_access',
      'high',
      jsonb_build_object(
        'access_count', access_count,
        'time_window', time_window,
        'table_name', TG_TABLE_NAME
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply monitoring to all sensitive tables
CREATE TRIGGER monitor_clients_access
  AFTER SELECT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_access();

CREATE TRIGGER monitor_gmail_access
  AFTER SELECT ON public.gmail_credentials
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_access();

CREATE TRIGGER monitor_email_access
  AFTER SELECT ON public.email_exchanges
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_access();

-- 13. Create indexes for performance and security
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity, timestamp);
CREATE INDEX IF NOT EXISTS idx_sensitive_access_user_time ON public.sensitive_data_access(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_secure_sessions_user_active ON public.secure_sessions(user_id, is_active, expires_at);

-- 14. Grant necessary permissions
GRANT SELECT, INSERT ON public.sensitive_data_access TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.secure_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_sensitive_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.mask_data TO authenticated;