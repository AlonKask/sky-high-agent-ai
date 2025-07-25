-- First update existing email statuses to match the new constraint
UPDATE public.email_exchanges 
SET status = 'received' 
WHERE status = 'delivered';

-- Update any other non-standard statuses
UPDATE public.email_exchanges 
SET status = 'sent' 
WHERE status NOT IN ('sent', 'received', 'draft', 'failed', 'queued');

-- Now create the missing table and constraints
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  gmail_access_token TEXT,
  gmail_refresh_token TEXT,
  gmail_token_expiry TIMESTAMP WITH TIME ZONE,
  gmail_user_email TEXT,
  email_notifications BOOLEAN DEFAULT true,
  sync_frequency INTEGER DEFAULT 300,
  auto_categorize BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'system',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own preferences" 
ON public.user_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_gmail_email ON public.user_preferences(gmail_user_email) WHERE gmail_user_email IS NOT NULL;

-- Update email_exchanges status constraint
ALTER TABLE public.email_exchanges DROP CONSTRAINT IF EXISTS email_exchanges_status_check;
ALTER TABLE public.email_exchanges ADD CONSTRAINT email_exchanges_status_check 
CHECK (status IN ('sent', 'received', 'draft', 'failed', 'queued'));

-- Create search function for emails
CREATE OR REPLACE FUNCTION public.search_emails_simple(
  search_query TEXT,
  user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  email_id UUID,
  subject TEXT,
  sender_email TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  body TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.subject,
    e.sender_email,
    e.received_at,
    LEFT(e.body, 200) as body
  FROM public.email_exchanges e
  WHERE 
    e.user_id = user_uuid 
    AND (
      e.subject ILIKE '%' || search_query || '%' OR
      e.sender_email ILIKE '%' || search_query || '%' OR
      e.body ILIKE '%' || search_query || '%'
    )
  ORDER BY e.received_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;