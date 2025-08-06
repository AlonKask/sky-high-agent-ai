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