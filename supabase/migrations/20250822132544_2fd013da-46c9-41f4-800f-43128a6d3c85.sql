-- Fix digest function schema issue in log_critical_data_access functions
CREATE OR REPLACE FUNCTION public.log_critical_data_access(
  p_table_name text,
  p_record_id uuid,
  p_operation text,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  audit_id uuid;
  integrity_hash text;
BEGIN
  -- Generate unique audit ID
  audit_id := gen_random_uuid();
  
  -- Create integrity hash using extensions.digest with PostgreSQL string concatenation
  integrity_hash := encode(
    extensions.digest(
      COALESCE(auth.uid()::text, '00000000-0000-0000-0000-000000000000') ||
      p_table_name ||
      p_record_id::text ||
      p_operation ||
      COALESCE(p_old_values::text, '') ||
      COALESCE(p_new_values::text, '') ||
      extract(epoch from now())::text,
      'sha256'
    ),
    'hex'
  );
  
  -- Insert critical audit record
  INSERT INTO public.critical_audit_trail (
    id,
    user_id,
    table_name,
    record_id,
    operation_type,
    old_values,
    new_values,
    integrity_hash,
    timestamp,
    risk_assessment,
    session_id,
    ip_address,
    user_agent
  ) VALUES (
    audit_id,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    p_table_name,
    p_record_id,
    p_operation,
    p_old_values,
    p_new_values,
    integrity_hash,
    now(),
    CASE 
      WHEN p_table_name IN ('clients', 'quotes', 'bookings') THEN 'high'
      ELSE 'medium'
    END,
    current_setting('application_name', true),
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
  
  -- Log security event
  PERFORM public.log_security_event(
    'critical_data_access',
    'high',
    jsonb_build_object(
      'table', p_table_name,
      'operation', p_operation,
      'record_id', p_record_id,
      'audit_id', audit_id,
      'integrity_verified', true
    )
  );
END;
$function$;

-- Also fix the trigger version of the function
CREATE OR REPLACE FUNCTION public.log_critical_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  audit_id uuid;
  integrity_hash text;
BEGIN
  -- Generate unique audit ID
  audit_id := gen_random_uuid();
  
  -- Create integrity hash using extensions.digest with PostgreSQL string concatenation
  integrity_hash := encode(
    extensions.digest(
      COALESCE(auth.uid()::text, '00000000-0000-0000-0000-000000000000') ||
      TG_TABLE_NAME ||
      COALESCE(NEW.id, OLD.id)::text ||
      TG_OP ||
      COALESCE(to_jsonb(OLD)::text, '') ||
      COALESCE(to_jsonb(NEW)::text, '') ||
      extract(epoch from now())::text,
      'sha256'
    ),
    'hex'
  );
  
  -- Insert critical audit record
  INSERT INTO public.critical_audit_trail (
    id,
    user_id,
    table_name,
    record_id,
    operation_type,
    old_values,
    new_values,
    integrity_hash,
    timestamp,
    risk_assessment,
    session_id,
    ip_address,
    user_agent
  ) VALUES (
    audit_id,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN OLD IS NOT NULL THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN NEW IS NOT NULL THEN to_jsonb(NEW) ELSE NULL END,
    integrity_hash,
    now(),
    CASE 
      WHEN TG_TABLE_NAME IN ('clients', 'quotes', 'bookings') THEN 'high'
      ELSE 'medium'
    END,
    current_setting('application_name', true),
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
  
  -- Log security event
  PERFORM public.log_security_event(
    'critical_data_access',
    'high',
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'audit_id', audit_id,
      'integrity_verified', true
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;