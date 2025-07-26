-- Fix database functions search_path security issues
CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_severity text, p_details jsonb DEFAULT '{}'::jsonb, p_user_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, severity, details, timestamp
  ) VALUES (
    COALESCE(p_user_id, auth.uid()), 
    p_event_type, 
    p_severity, 
    p_details, 
    now()
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$function$;

-- Fix other functions with similar issues
CREATE OR REPLACE FUNCTION public.update_client_memory(p_user_id uuid, p_client_id uuid, p_interaction_summary text, p_preferences jsonb DEFAULT '{}'::jsonb, p_pain_points jsonb DEFAULT '[]'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.client_memories (
    user_id, 
    client_id, 
    relationship_summary, 
    preferences, 
    pain_points,
    last_interaction,
    last_updated
  )
  VALUES (p_user_id, p_client_id, p_interaction_summary, p_preferences, p_pain_points, now(), now())
  ON CONFLICT (user_id, client_id) 
  DO UPDATE SET 
    relationship_summary = CASE 
      WHEN length(client_memories.relationship_summary) > 1500 
      THEN substring(client_memories.relationship_summary from 300) || E'\n\n' || p_interaction_summary
      ELSE client_memories.relationship_summary || E'\n\n' || p_interaction_summary
    END,
    preferences = client_memories.preferences || p_preferences,
    pain_points = client_memories.pain_points || p_pain_points,
    last_interaction = now(),
    last_updated = now(),
    memory_version = client_memories.memory_version + 1;
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

-- Add proper email exchange status validation
ALTER TABLE email_exchanges DROP CONSTRAINT IF EXISTS email_exchanges_status_check;
ALTER TABLE email_exchanges ADD CONSTRAINT email_exchanges_status_check 
CHECK (status IN ('draft', 'sent', 'delivered', 'failed', 'bounced', 'read', 'replied'));

-- Add rate limiting table constraints
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits (identifier, endpoint, window_start);

-- Add security events index for better performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_severity ON public.security_events (user_id, severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON public.security_events (timestamp DESC);

-- Add audit logs performance index
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_table ON public.audit_logs (user_id, table_name, timestamp DESC);