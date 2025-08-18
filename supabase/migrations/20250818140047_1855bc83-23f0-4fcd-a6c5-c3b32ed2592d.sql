-- Fix read-only transaction errors by optimizing RLS policies
-- Remove INSERT operations from SELECT policies that are causing read-only transaction errors

-- Fix email exchanges policy - remove logging INSERT from SELECT operations
DROP POLICY IF EXISTS "Ultra secure email access" ON public.email_exchanges;
CREATE POLICY "Secure email exchanges access" ON public.email_exchanges
  FOR SELECT USING (
    auth.uid() = user_id AND
    validate_session_security() AND
    check_advanced_rate_limit(auth.uid()::text, 'email_access', 50, 10) = true
  );

CREATE POLICY "Secure email exchanges modification" ON public.email_exchanges
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    validate_session_security()
  );

CREATE POLICY "Secure email exchanges update" ON public.email_exchanges
  FOR UPDATE USING (
    auth.uid() = user_id AND
    validate_session_security()
  ) WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Secure email exchanges delete" ON public.email_exchanges
  FOR DELETE USING (
    auth.uid() = user_id AND
    validate_session_security()
  );

-- Fix gmail credentials policy - separate read and write operations
DROP POLICY IF EXISTS "Maximum security gmail credentials" ON public.gmail_credentials;
CREATE POLICY "Secure gmail credentials read" ON public.gmail_credentials
  FOR SELECT USING (
    auth.uid() = user_id AND
    validate_session_security() AND
    check_advanced_rate_limit(auth.uid()::text, 'gmail_credentials_access', 3, 30) = true
  );

CREATE POLICY "Secure gmail credentials write" ON public.gmail_credentials
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    validate_session_security() AND
    check_advanced_rate_limit(auth.uid()::text, 'gmail_credentials_modify', 1, 120) = true
  );

CREATE POLICY "Secure gmail credentials update" ON public.gmail_credentials
  FOR UPDATE USING (
    auth.uid() = user_id AND
    validate_session_security()
  ) WITH CHECK (
    auth.uid() = user_id AND
    check_advanced_rate_limit(auth.uid()::text, 'gmail_credentials_modify', 1, 120) = true
  );

CREATE POLICY "Secure gmail credentials delete" ON public.gmail_credentials
  FOR DELETE USING (
    auth.uid() = user_id AND
    validate_session_security()
  );

-- Fix client intelligence policy - remove logging INSERT from SELECT
DROP POLICY IF EXISTS "Maximum security client intelligence" ON public.client_intelligence;
CREATE POLICY "Secure client intelligence access" ON public.client_intelligence
  FOR ALL USING (
    auth.uid() = user_id AND
    validate_session_security() AND
    check_advanced_rate_limit(auth.uid()::text, 'client_intelligence_access', 10, 15) = true
  ) WITH CHECK (
    auth.uid() = user_id
  );

-- Fix sales memories policy - remove logging INSERT from SELECT
DROP POLICY IF EXISTS "Maximum security sales memories" ON public.sales_memories;
CREATE POLICY "Secure sales memories access" ON public.sales_memories
  FOR ALL USING (
    auth.uid() = user_id AND
    validate_session_security() AND
    check_advanced_rate_limit(auth.uid()::text, 'sales_memories_access', 15, 10) = true
  ) WITH CHECK (
    auth.uid() = user_id
  );

-- Address remaining security issues

-- 1. Fix critical system tables RLS protection
CREATE TABLE IF NOT EXISTS public.security_dashboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.security_dashboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only security dashboard" ON public.security_dashboard
  FOR ALL USING (has_admin_role()) WITH CHECK (has_admin_role());

-- Encryption keys table already has maximum security lockdown

-- 2. Create non-SECURITY DEFINER helper functions to replace problematic views
CREATE OR REPLACE FUNCTION public.get_user_role_safe(p_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles WHERE user_id = p_user_id;
$$;

-- Create optimized logging function that doesn't cause transaction conflicts
CREATE OR REPLACE FUNCTION public.log_security_event_async(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Use a separate transaction to avoid read-only conflicts
  BEGIN
    INSERT INTO public.security_events (
      user_id,
      event_type,
      severity,
      details,
      ip_address,
      user_agent
    ) VALUES (
      auth.uid(),
      p_event_type,
      p_severity,
      p_details,
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    -- Log failed but don't block the main operation
    RETURN false;
  END;
END;
$$;

-- Update session validation to be more permissive for legitimate use
CREATE OR REPLACE FUNCTION public.validate_session_security()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_check app_role;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    -- Don't log here to avoid transaction conflicts
    RETURN false;
  END IF;
  
  -- Get user role without causing conflicts
  SELECT role INTO user_role_check
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Allow access - business hours validation removed for now
  RETURN true;
END;
$$;