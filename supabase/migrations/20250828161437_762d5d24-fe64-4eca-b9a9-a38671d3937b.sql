-- Phase 2: Add unique constraint to prevent duplicates
ALTER TABLE email_exchanges ADD CONSTRAINT unique_user_message_id UNIQUE (user_id, message_id);

-- Phase 3: Data cleanup - Remove duplicates keeping the earliest created
WITH duplicate_emails AS (
  SELECT user_id, message_id, MIN(created_at) as first_created
  FROM email_exchanges 
  GROUP BY user_id, message_id 
  HAVING COUNT(*) > 1
),
emails_to_keep AS (
  SELECT ee.id
  FROM email_exchanges ee
  INNER JOIN duplicate_emails de 
    ON ee.user_id = de.user_id 
    AND ee.message_id = de.message_id 
    AND ee.created_at = de.first_created
),
emails_to_delete AS (
  SELECT ee.id
  FROM email_exchanges ee
  WHERE EXISTS (
    SELECT 1 FROM duplicate_emails de 
    WHERE ee.user_id = de.user_id 
    AND ee.message_id = de.message_id
  )
  AND ee.id NOT IN (SELECT id FROM emails_to_keep)
)
DELETE FROM email_exchanges 
WHERE id IN (SELECT id FROM emails_to_delete);

-- Reset sync status to force fresh sync from clean state
DELETE FROM email_sync_status;