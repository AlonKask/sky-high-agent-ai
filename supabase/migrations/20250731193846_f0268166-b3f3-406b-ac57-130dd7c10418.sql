-- Fix the duplicate key constraint issue in email_sync_status table
ALTER TABLE email_sync_status DROP CONSTRAINT IF EXISTS email_sync_status_user_id_folder_name_key;

-- Add a proper unique constraint that handles the folder_name properly
ALTER TABLE email_sync_status ADD CONSTRAINT email_sync_status_user_id_folder_name_key 
UNIQUE (user_id, folder_name);