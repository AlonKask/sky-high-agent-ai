-- Clean slate: Delete all synced emails and reset Gmail integration state

-- Delete all email exchanges
DELETE FROM public.email_exchanges;

-- Delete email sync status records
DELETE FROM public.email_sync_status;

-- Delete any email archives if they exist
DELETE FROM public.email_archives WHERE TRUE;

-- Delete AI email conversations and messages
DELETE FROM public.ai_email_messages;
DELETE FROM public.ai_email_conversations;

-- Delete AI email drafts
DELETE FROM public.ai_email_drafts;

-- Delete AI email analytics
DELETE FROM public.ai_email_analytics;

-- Reset any excluded emails (keeping the exclusions but clearing sync-related data)
-- Note: Not deleting excluded_emails as these are user preferences

-- Log the cleanup action
INSERT INTO public.security_events (
  event_type,
  severity,
  details
) VALUES (
  'email_data_cleanup',
  'medium',
  jsonb_build_object(
    'action', 'manual_cleanup',
    'reason', 'troubleshooting_gmail_integration',
    'timestamp', now()
  )
);