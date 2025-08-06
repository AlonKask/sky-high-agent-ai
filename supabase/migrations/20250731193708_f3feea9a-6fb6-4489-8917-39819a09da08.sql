-- Fix the duplicate key constraint issue in email_sync_status table
-- Drop the existing unique constraint and recreate it properly
ALTER TABLE email_sync_status DROP CONSTRAINT IF EXISTS email_sync_status_user_id_folder_name_key;

-- Add a proper unique constraint that handles the folder_name properly
ALTER TABLE email_sync_status ADD CONSTRAINT email_sync_status_user_id_folder_name_key 
UNIQUE (user_id, folder_name);

-- Update the handle_email_sync_status function to use proper upsert
CREATE OR REPLACE FUNCTION public.handle_email_sync_status(
    p_user_id uuid, 
    p_folder_name text, 
    p_last_sync_at timestamp with time zone, 
    p_last_sync_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.email_sync_status (
        user_id, 
        folder_name, 
        last_sync_at, 
        last_sync_count, 
        updated_at
    ) VALUES (
        p_user_id, 
        COALESCE(p_folder_name, 'inbox'), 
        p_last_sync_at, 
        p_last_sync_count, 
        now()
    )
    ON CONFLICT (user_id, folder_name) 
    DO UPDATE SET 
        last_sync_at = EXCLUDED.last_sync_at,
        last_sync_count = EXCLUDED.last_sync_count,
        updated_at = now();
END;
$function$

-- Create a proper Gmail credentials table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS public.gmail_credentials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gmail_user_email text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    token_expires_at timestamp with time zone,
    scope text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS on gmail_credentials
ALTER TABLE public.gmail_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for gmail_credentials
CREATE POLICY "Users can manage their own Gmail credentials" 
ON public.gmail_credentials 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_gmail_credentials_updated_at
    BEFORE UPDATE ON public.gmail_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure user_preferences has proper Gmail fields
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS gmail_user_email text,
ADD COLUMN IF NOT EXISTS gmail_access_token text,
ADD COLUMN IF NOT EXISTS gmail_refresh_token text,
ADD COLUMN IF NOT EXISTS gmail_token_expires_at timestamp with time zone;