-- Complete final security fixes and database optimizations

-- Fix function search paths for security compliance
CREATE OR REPLACE FUNCTION public.archive_old_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.archive_old_communications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.ai_email_conversations 
  WHERE updated_at < NOW() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.ai_email_messages 
    WHERE conversation_id = ai_email_conversations.id 
    AND created_at > NOW() - INTERVAL '30 days'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Add missing performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_exchanges_user_created 
ON email_exchanges(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_status 
ON bookings(user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_user_email 
ON clients(user_id, email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_user_status 
ON requests(user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_user_status 
ON quotes(user_id, status);

-- Add production health check function
CREATE OR REPLACE FUNCTION public.health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  db_time timestamp;
  table_count integer;
BEGIN
  -- Check database connectivity and basic operations
  SELECT now() INTO db_time;
  
  -- Count some tables to verify basic read access
  SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public';
  
  result := jsonb_build_object(
    'status', 'healthy',
    'timestamp', db_time,
    'database', 'connected',
    'table_count', table_count,
    'version', '1.0.0'
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'error',
    'message', SQLERRM,
    'timestamp', now()
  );
END;
$$;