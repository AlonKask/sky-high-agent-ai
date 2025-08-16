-- FINAL SECURITY FIX - Fix remaining functions with empty search_path
-- Set proper search_path for all remaining SECURITY DEFINER functions

-- Fix functions that have search_path="" instead of search_path="public"
CREATE OR REPLACE FUNCTION public.audit_clients_sensitive_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    INSERT INTO security_events (user_id, event_type, severity, details)
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

CREATE OR REPLACE FUNCTION public.audit_sensitive_client_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access to sensitive client data
  INSERT INTO security_events (user_id, event_type, severity, details)
  VALUES (
    auth.uid(),
    'sensitive_client_access',
    'medium',
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_teams(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role IN ('admin', 'manager', 'supervisor')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_modify_data(_user_id uuid, _resource_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- User can modify their own data
    _user_id = _resource_user_id
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role IN ('supervisor', 'manager', 'admin')
    );
$$;