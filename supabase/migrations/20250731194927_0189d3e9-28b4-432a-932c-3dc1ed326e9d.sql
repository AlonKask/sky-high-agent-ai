-- Fix database function security by setting proper search paths
-- This addresses the security linter warnings

-- Update handle_email_sync_status function
CREATE OR REPLACE FUNCTION public.handle_email_sync_status(p_user_id uuid, p_folder_name text, p_last_sync_at timestamp with time zone, p_last_sync_count integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.email_sync_status (
        user_id, 
        folder_name, 
        last_sync_at, 
        last_sync_count, 
        updated_at
    ) VALUES (
        p_user_id, 
        p_folder_name, 
        p_last_sync_at, 
        p_last_sync_count, 
        now()
    )
    ON CONFLICT (user_id, folder_name) 
    DO UPDATE SET 
        last_sync_at = EXCLUDED.last_sync_at,
        last_sync_count = EXCLUDED.last_sync_count,
        updated_at = now();
END;
$function$;

-- Update update_client_memory function
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

-- Update log_security_event function
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

-- Update archive_old_emails function
CREATE OR REPLACE FUNCTION public.archive_old_emails()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Archive emails older than 30 days to archives table
  INSERT INTO public.email_archives (
    user_id, message_id, thread_id, subject, sender_email, 
    archived_date, original_data, folder_name
  )
  SELECT 
    user_id, message_id, thread_id, subject, sender_email,
    now(), 
    jsonb_build_object(
      'body', body,
      'recipient_emails', recipient_emails,
      'cc_emails', cc_emails,
      'bcc_emails', bcc_emails,
      'metadata', metadata,
      'attachments', attachments,
      'created_at', created_at
    ),
    CASE 
      WHEN metadata->>'gmail_labels' LIKE '%SENT%' THEN 'sent'
      WHEN metadata->>'gmail_labels' LIKE '%DRAFT%' THEN 'drafts'
      WHEN metadata->>'gmail_labels' LIKE '%SPAM%' THEN 'spam'
      WHEN metadata->>'gmail_labels' LIKE '%TRASH%' THEN 'trash'
      ELSE 'inbox'
    END
  FROM public.email_exchanges 
  WHERE created_at < now() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.email_archives 
    WHERE email_archives.message_id = email_exchanges.message_id
    AND email_archives.user_id = email_exchanges.user_id
  );
  
  DELETE FROM public.email_exchanges 
  WHERE created_at < now() - INTERVAL '30 days';
END;
$function$;

-- Update archive_old_communications function
CREATE OR REPLACE FUNCTION public.archive_old_communications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.communication_archive (
    user_id, client_id, communication_type, content_summary, 
    original_content, original_date, retention_expiry
  )
  SELECT 
    user_id, client_id, 'email', 
    LEFT(subject || ': ' || body, 500),
    jsonb_build_object(
      'subject', subject,
      'body', body,
      'sender_email', sender_email,
      'recipient_emails', recipient_emails
    ),
    created_at,
    now() + INTERVAL '7 years'
  FROM public.email_exchanges 
  WHERE created_at < now() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.communication_archive 
    WHERE communication_archive.user_id = email_exchanges.user_id 
    AND communication_archive.client_id = email_exchanges.client_id
    AND communication_archive.original_date = email_exchanges.created_at
  );
  
  DELETE FROM public.email_exchanges 
  WHERE created_at < now() - INTERVAL '90 days';
END;
$function$;

-- Update update_user_memory function
CREATE OR REPLACE FUNCTION public.update_user_memory(p_user_id uuid, p_new_context text, p_interaction_type text DEFAULT 'conversation'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_memories (user_id, summary, last_updated)
  VALUES (p_user_id, p_new_context, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    summary = CASE 
      WHEN length(user_memories.summary) > 2000 
      THEN substring(user_memories.summary from 500) || E'\n\n' || p_new_context
      ELSE user_memories.summary || E'\n\n' || p_new_context
    END,
    last_updated = now(),
    memory_version = user_memories.memory_version + 1;
END;
$function$;

-- Update create_audit_log function
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

-- Update validate_password_strength function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF length(password) < 8 THEN
    RETURN false;
  END IF;
  
  IF password !~ '[A-Z]' THEN
    RETURN false;
  END IF;
  
  IF password !~ '[a-z]' THEN
    RETURN false;
  END IF;
  
  IF password !~ '[0-9]' THEN
    RETURN false;
  END IF;
  
  IF password !~ '[^A-Za-z0-9]' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- Update cleanup_old_conversations function
CREATE OR REPLACE FUNCTION public.cleanup_old_conversations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.ai_email_conversations 
  WHERE updated_at < NOW() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.ai_email_messages 
    WHERE conversation_id = ai_email_conversations.id 
    AND created_at > NOW() - INTERVAL '30 days'
  );
END;
$function$;

-- Update create_notification function
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_type text DEFAULT 'info'::text, p_priority text DEFAULT 'medium'::text, p_action_url text DEFAULT NULL::text, p_related_id uuid DEFAULT NULL::uuid, p_related_type text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id, title, message, type, priority, 
        action_url, related_id, related_type
    )
    VALUES (
        p_user_id, p_title, p_message, p_type, p_priority,
        p_action_url, p_related_id, p_related_type
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$function$;