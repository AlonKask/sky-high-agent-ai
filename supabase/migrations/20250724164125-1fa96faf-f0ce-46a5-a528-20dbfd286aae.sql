-- Create table to store emails marked as "not client"
CREATE TABLE public.excluded_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text NOT NULL,
  reason text DEFAULT 'not_client',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Enable RLS on excluded_emails table
ALTER TABLE public.excluded_emails ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for excluded_emails
CREATE POLICY "Users can manage their own excluded emails"
ON public.excluded_emails
FOR ALL
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_excluded_emails_user_email ON public.excluded_emails(user_id, email);