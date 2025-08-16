-- Fix remaining functions with missing search_path
CREATE OR REPLACE FUNCTION public.email_sync_status_upsert_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If a row with same (user_id, folder_name) exists, update it and skip the insert
  UPDATE public.email_sync_status AS ess
  SET 
    last_sync_at = COALESCE(NEW.last_sync_at, ess.last_sync_at),
    last_sync_count = COALESCE(NEW.last_sync_count, ess.last_sync_count),
    gmail_history_id = COALESCE(NEW.gmail_history_id, ess.gmail_history_id),
    updated_at = now()
  WHERE ess.user_id = NEW.user_id
    AND ess.folder_name = NEW.folder_name;

  IF FOUND THEN
    -- Skip inserting a duplicate; UPDATE already applied
    RETURN NULL;
  END IF;

  -- Ensure updated_at is set for fresh inserts
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_audit_log(p_table_name text, p_operation text, p_record_id uuid DEFAULT NULL::uuid, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.audit_logs (
        user_id, table_name, operation, record_id, 
        old_values, new_values, timestamp
    ) VALUES (
        auth.uid(), p_table_name, p_operation, p_record_id,
        p_old_values, p_new_values, now()
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_sensitive_table_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log any access to sensitive tables
  INSERT INTO public.security_events (
    user_id, event_type, severity, details
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'sensitive_table_access',
    CASE 
      WHEN auth.uid() IS NULL THEN 'critical'
      ELSE 'low'
    END,
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'authenticated', auth.uid() IS NOT NULL,
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;