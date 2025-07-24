-- Add Gmail OAuth token fields to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN gmail_access_token text,
ADD COLUMN gmail_refresh_token text,
ADD COLUMN gmail_token_expiry timestamp with time zone,
ADD COLUMN gmail_user_email text;