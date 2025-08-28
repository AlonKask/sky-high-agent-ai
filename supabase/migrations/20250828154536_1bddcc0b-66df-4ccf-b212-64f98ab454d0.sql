-- Optimize email_exchanges table for better sync performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_exchanges_user_folder_created 
ON email_exchanges(user_id, folder_name, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_exchanges_user_message_id 
ON email_exchanges(user_id, message_id);

-- Update email_sync_config to support larger syncs
UPDATE email_sync_config 
SET 
  max_emails_per_sync = 500,
  sync_days_back = 730
WHERE max_emails_per_sync < 500;