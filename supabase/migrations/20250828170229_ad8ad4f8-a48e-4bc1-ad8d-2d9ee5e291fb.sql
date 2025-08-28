-- Add unique constraint now that duplicates are cleaned
ALTER TABLE email_exchanges ADD CONSTRAINT unique_user_message_id UNIQUE (user_id, message_id);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_email_exchanges_user_folder ON email_exchanges (user_id, folder_name);
CREATE INDEX IF NOT EXISTS idx_email_exchanges_created_at ON email_exchanges (created_at);
CREATE INDEX IF NOT EXISTS idx_email_sync_status_user_folder ON email_sync_status (user_id, folder_name);