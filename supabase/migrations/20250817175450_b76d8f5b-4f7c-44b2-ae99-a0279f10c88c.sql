-- ========================================
-- CRITICAL SECURITY FIX: ENCRYPTION KEYS TABLE HARDENING
-- ========================================

-- Phase 1: Revoke all permissions from encryption_keys table
REVOKE ALL ON public.encryption_keys FROM anon;
REVOKE ALL ON public.encryption_keys FROM authenticated;
REVOKE ALL ON public.encryption_keys FROM public;

-- Phase 2: Drop and recreate RLS policies with maximum security
DROP POLICY IF EXISTS "System-only encryption keys access" ON public.encryption_keys;

-- Create ultra-restrictive RLS policies
CREATE POLICY "ABSOLUTE_DENY_all_access_encryption_keys" 
ON public.encryption_keys 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- Phase 3: Create system-only functions for encryption key management
CREATE OR REPLACE FUNCTION private.get_active_encryption_key()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'private', 'public'
AS $$
DECLARE
  active_key_id uuid;
BEGIN
  -- This function can only be called by system/service role
  IF current_setting('role') NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Unauthorized access to encryption key system' USING ERRCODE = '42501';
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

-- Phase 4: Create secure encryption key rotation function (system-only)
CREATE OR REPLACE FUNCTION private.rotate_encryption_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'private', 'public'
AS $$
BEGIN
  -- Only system can rotate keys
  IF current_setting('role') NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Unauthorized key rotation attempt' USING ERRCODE = '42501';
  END IF;
  
  -- Mark current keys as deprecated
  UPDATE public.encryption_keys
  SET status = 'deprecated', expires_at = now() + INTERVAL '30 days'
  WHERE status = 'active';
  
  -- Log security event
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'encryption_key_rotation',
    'critical',
    jsonb_build_object(
      'operation', 'key_rotation',
      'timestamp', now(),
      'automated', true
    )
  );
END;
$$;

-- Phase 5: Remove encryption_key_id column from clients table for security
-- Instead, use the system function to get active key
ALTER TABLE public.clients DROP COLUMN IF EXISTS encryption_key_id;

-- Phase 6: Create ultra-secure audit logging for any access attempts
CREATE OR REPLACE FUNCTION public.log_encryption_key_access_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log any access attempt to encryption keys as critical security event
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'encryption_key_access_attempt',
    'critical',
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', now(),
      'user_authenticated', auth.uid() IS NOT NULL,
      'current_role', current_setting('role'),
      'security_breach_attempt', true
    )
  );
  
  -- Always deny the operation
  RAISE EXCEPTION 'SECURITY VIOLATION: Unauthorized access to encryption infrastructure' USING ERRCODE = '42501';
END;
$$;

-- Apply the trigger to catch any access attempts
DROP TRIGGER IF EXISTS encryption_key_access_monitor ON public.encryption_keys;
CREATE TRIGGER encryption_key_access_monitor
  BEFORE SELECT OR INSERT OR UPDATE OR DELETE ON public.encryption_keys
  FOR EACH STATEMENT EXECUTE FUNCTION public.log_encryption_key_access_attempt();

-- Phase 7: Create private schema for system-only operations
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO service_role;