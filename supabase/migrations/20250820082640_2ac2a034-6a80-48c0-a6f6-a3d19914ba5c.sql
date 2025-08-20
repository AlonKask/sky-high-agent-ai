-- Fix search path security warning
-- Update the function to have a stable search path

CREATE OR REPLACE FUNCTION public.enhanced_security_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all operations on sensitive tables with enhanced details
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'sensitive_data_operation',
    CASE 
      WHEN auth.uid() IS NULL THEN 'critical'
      WHEN TG_OP IN ('UPDATE', 'DELETE') THEN 'high'
      ELSE 'medium'
    END,
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'authenticated', auth.uid() IS NOT NULL,
      'user_role', (SELECT role FROM public.user_roles WHERE user_id = auth.uid()),
      'timestamp', now(),
      'data_classification', 
        CASE TG_TABLE_NAME
          WHEN 'clients' THEN 'confidential'
          WHEN 'quotes' THEN 'financial'
          WHEN 'email_exchanges' THEN 'private'
          WHEN 'bookings' THEN 'travel_sensitive'
          ELSE 'general'
        END,
      'operation_metadata', jsonb_build_object(
        'affected_columns', 
          CASE TG_OP
            WHEN 'UPDATE' THEN (
              SELECT array_agg(key) 
              FROM jsonb_each(to_jsonb(NEW)) 
              WHERE value IS DISTINCT FROM (to_jsonb(OLD) -> key)
            )
            ELSE NULL
          END
      )
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';