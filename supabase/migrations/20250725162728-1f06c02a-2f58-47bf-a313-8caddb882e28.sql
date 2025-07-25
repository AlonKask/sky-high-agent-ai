-- Fix remaining database security issues with correct column names

-- Fix function search_path issues for remaining functions
CREATE OR REPLACE FUNCTION public.archive_old_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.archive_old_communications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.cleanup_old_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Add indexes for security tables with correct column names
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON public.security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_sensitive_data_access_user_id ON public.sensitive_data_access(user_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_data_access_timestamp ON public.sensitive_data_access(timestamp);