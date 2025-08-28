-- Create indexes for better sync performance (without CONCURRENT)
CREATE INDEX IF NOT EXISTS idx_email_exchanges_user_folder_created 
ON email_exchanges(user_id, folder_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_exchanges_user_message_id 
ON email_exchanges(user_id, message_id);

-- Update email_sync_config to support larger syncs
UPDATE email_sync_config 
SET 
  max_emails_per_sync = 500,
  sync_days_back = 730
WHERE max_emails_per_sync < 500;

-- Insert default config for users without one
INSERT INTO email_sync_config (
  user_id, 
  max_emails_per_sync, 
  sync_days_back, 
  enable_full_mailbox_sync,
  enable_historical_sync
)
SELECT 
  DISTINCT user_id,
  500,
  730,
  true,
  true
FROM gmail_credentials gc
WHERE NOT EXISTS (
  SELECT 1 FROM email_sync_config esc 
  WHERE esc.user_id = gc.user_id
);