-- Phase 3: Clean up duplicate data first
WITH duplicate_emails AS (
  SELECT user_id, message_id, MIN(created_at) as first_created, COUNT(*) as duplicate_count
  FROM email_exchanges 
  GROUP BY user_id, message_id 
  HAVING COUNT(*) > 1
),
emails_to_delete AS (
  SELECT ee.id
  FROM email_exchanges ee
  INNER JOIN duplicate_emails de 
    ON ee.user_id = de.user_id 
    AND ee.message_id = de.message_id 
    AND ee.created_at > de.first_created
)
DELETE FROM email_exchanges 
WHERE id IN (SELECT id FROM emails_to_delete);

-- Reset sync status to force clean sync
DELETE FROM email_sync_status;