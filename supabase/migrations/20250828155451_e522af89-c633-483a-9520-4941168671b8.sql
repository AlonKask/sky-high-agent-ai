-- Phase 5: Database Optimization - Add indexes for better performance (fixed)
CREATE INDEX IF NOT EXISTS idx_email_exchanges_user_created 
ON email_exchanges(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_exchanges_user_folder_date 
ON email_exchanges(user_id, folder_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_exchanges_message_user 
ON email_exchanges(message_id, user_id);

-- Update email_sync_config defaults for better Gmail sync coverage
UPDATE email_sync_config 
SET 
  max_emails_per_sync = 1000,
  sync_days_back = 1000,
  enable_historical_sync = true,
  sync_preferences = COALESCE(sync_preferences, '{}') || '{"historical_start_date": "2024-06-18", "per_query_limit": 200}'::jsonb
WHERE max_emails_per_sync < 1000;