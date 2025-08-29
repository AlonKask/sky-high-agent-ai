-- Fix the option_reviews table to properly generate 64-character hex tokens
-- First, let's update existing records to use proper hex tokens
UPDATE option_reviews 
SET client_token = encode(extensions.gen_random_bytes(32), 'hex')
WHERE LENGTH(client_token) = 36;

-- Update the column default to ensure new records get hex tokens
ALTER TABLE option_reviews 
ALTER COLUMN client_token SET DEFAULT encode(extensions.gen_random_bytes(32), 'hex');