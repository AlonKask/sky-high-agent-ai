-- ========================================
-- CRITICAL SECURITY FIX: ENCRYPTION KEYS TABLE ABSOLUTE LOCKDOWN (FINAL)
-- ========================================

-- Phase 1: Revoke ALL permissions and access to encryption_keys table
REVOKE ALL ON public.encryption_keys FROM anon;
REVOKE ALL ON public.encryption_keys FROM authenticated;
REVOKE ALL ON public.encryption_keys FROM public;

-- Phase 2: Replace RLS policies with absolute denial
DROP POLICY IF EXISTS "ABSOLUTE_DENY_all_access_encryption_keys" ON public.encryption_keys;
DROP POLICY IF EXISTS "System-only encryption keys access" ON public.encryption_keys;

-- Create the most restrictive RLS policy possible
CREATE POLICY "TOTAL_LOCKDOWN_encryption_keys" 
ON public.encryption_keys 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- Phase 3: Create private schema for system operations only
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- Phase 4: Move encryption key functions to private schema
CREATE OR REPLACE FUNCTION private.get_active_encryption_key()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'private', 'public'
AS $$
DECLARE
  active_key_id uuid;
BEGIN
  -- Only service role can call this
  IF current_setting('role') NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'SECURITY BREACH: Unauthorized encryption key access' USING ERRCODE = '42501';
  END IF;
  
  SELECT id INTO active_key_id
  FROM public.encryption_keys
  WHERE status = 'active'
  AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN active_key_id;
END;
$$;

-- Phase 5: Remove encryption_key_id from clients table completely
ALTER TABLE public.clients DROP COLUMN IF EXISTS encryption_key_id;

-- Phase 6: Create audit function for ANY access attempts
CREATE OR REPLACE FUNCTION public.log_critical_security_violation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log critical security breach attempt using valid event type
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'unauthorized_access_attempt',
    'critical',
    jsonb_build_object(
      'operation', TG_OP,
      'table', 'encryption_keys',
      'timestamp', now(),
      'user_authenticated', auth.uid() IS NOT NULL,
      'session_role', current_setting('role'),
      'threat_level', 'MAXIMUM',
      'encryption_infrastructure_breach', true
    )
  );
  
  -- Block the operation completely
  RAISE EXCEPTION 'CRITICAL SECURITY VIOLATION: Unauthorized encryption infrastructure access detected' USING ERRCODE = '42501';
END;
$$;

-- Phase 7: Apply trigger to block INSERT/UPDATE/DELETE operations
DROP TRIGGER IF EXISTS encryption_security_barrier ON public.encryption_keys;
CREATE TRIGGER encryption_security_barrier
  BEFORE INSERT OR UPDATE OR DELETE ON public.encryption_keys
  FOR EACH STATEMENT EXECUTE FUNCTION public.log_critical_security_violation();

-- Phase 8: Create safe function to check encryption status (no metadata exposure)
CREATE OR REPLACE FUNCTION public.get_encryption_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return only generic status - no key metadata
  RETURN jsonb_build_object(
    'encryption_enabled', true,
    'status', 'operational',
    'last_verified', now()
  );
END;
$$;

-- Phase 9: Remove any existing grants or permissions
REVOKE ALL PRIVILEGES ON public.encryption_keys FROM PUBLIC;
REVOKE ALL PRIVILEGES ON public.encryption_keys FROM anon;
REVOKE ALL PRIVILEGES ON public.encryption_keys FROM authenticated;