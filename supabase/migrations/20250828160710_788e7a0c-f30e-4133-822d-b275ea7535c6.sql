-- Phase 1: Data cleanup for misclassified emails in sent folder
-- Move emails without SENT Gmail label from sent to inbox and fix their direction

-- First, let's identify and move emails that are in sent folder but don't have SENT Gmail label
UPDATE email_exchanges 
SET 
  folder_name = 'inbox',
  direction = 'inbound',
  updated_at = now()
WHERE 
  folder_name = 'sent' 
  AND (
    metadata->>'gmail_labels' IS NULL 
    OR NOT (metadata->>'gmail_labels' LIKE '%SENT%')
  );

-- Phase 2: Mark all legitimate sent emails (those with SENT Gmail label) as read
UPDATE email_exchanges 
SET 
  is_read = true,
  updated_at = now()
WHERE 
  folder_name = 'sent' 
  AND direction = 'outbound'
  AND metadata->>'gmail_labels' LIKE '%SENT%';

-- Phase 3: Log the cleanup operation
INSERT INTO security_events (
  user_id,
  event_type,
  severity,
  details
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'email_classification_cleanup',
  'medium',
  jsonb_build_object(
    'operation', 'gmail_sent_folder_cleanup',
    'description', 'Fixed misclassified emails in sent folder',
    'timestamp', now()
  )
);