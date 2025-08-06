-- Phase 1: Create missing user_preferences table for Gmail integration
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  gmail_access_token TEXT,
  gmail_refresh_token TEXT,
  gmail_token_expiry TIMESTAMP WITH TIME ZONE,
  gmail_user_email TEXT,
  email_notifications BOOLEAN DEFAULT true,
  sync_frequency INTEGER DEFAULT 300, -- seconds
  auto_categorize BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'system',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_preferences
CREATE POLICY "Users can manage their own preferences" 
ON public.user_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- Create email conversation threads table
CREATE TABLE IF NOT EXISTS public.email_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  thread_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  participants TEXT[] NOT NULL DEFAULT '{}',
  message_count INTEGER DEFAULT 1,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, thread_id)
);

-- Enable RLS on email_threads
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_threads
CREATE POLICY "Users can manage their own email threads" 
ON public.email_threads 
FOR ALL 
USING (auth.uid() = user_id);

-- Create email search index table for better performance
CREATE TABLE IF NOT EXISTS public.email_search_index (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_id UUID NOT NULL,
  search_vector TSVECTOR,
  content_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, email_id)
);

-- Enable RLS on email_search_index
ALTER TABLE public.email_search_index ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_search_index
CREATE POLICY "Users can manage their own search index" 
ON public.email_search_index 
FOR ALL 
USING (auth.uid() = user_id);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_email_search_vector ON public.email_search_index USING gin(search_vector);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON public.email_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_last_message ON public.email_threads(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_exchanges_thread_id ON public.email_exchanges(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_email_exchanges_received_at ON public.email_exchanges(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_exchanges_direction ON public.email_exchanges(user_id, direction);

-- Add thread_id to email_exchanges if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_exchanges' AND column_name = 'thread_id') THEN
        ALTER TABLE public.email_exchanges ADD COLUMN thread_id TEXT;
    END IF;
END $$;

-- Create function to update email threads when emails are inserted
CREATE OR REPLACE FUNCTION public.update_email_thread()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update the email thread
  INSERT INTO public.email_threads (
    user_id, 
    thread_id, 
    subject, 
    participants, 
    last_message_at,
    updated_at
  )
  VALUES (
    NEW.user_id,
    COALESCE(NEW.thread_id, NEW.message_id),
    NEW.subject,
    ARRAY[NEW.sender_email] || NEW.recipient_emails,
    COALESCE(NEW.received_at, NEW.created_at),
    now()
  )
  ON CONFLICT (user_id, thread_id) 
  DO UPDATE SET
    participants = ARRAY(SELECT DISTINCT unnest(email_threads.participants || ARRAY[NEW.sender_email] || NEW.recipient_emails)),
    message_count = email_threads.message_count + 1,
    last_message_at = GREATEST(email_threads.last_message_at, COALESCE(NEW.received_at, NEW.created_at)),
    updated_at = now();

  -- Update search index
  INSERT INTO public.email_search_index (
    user_id,
    email_id,
    search_vector,
    content_hash
  )
  VALUES (
    NEW.user_id,
    NEW.id,
    to_tsvector('english', COALESCE(NEW.subject, '') || ' ' || COALESCE(NEW.body, '') || ' ' || COALESCE(NEW.sender_email, '')),
    md5(COALESCE(NEW.subject, '') || COALESCE(NEW.body, ''))
  )
  ON CONFLICT (user_id, email_id) 
  DO UPDATE SET
    search_vector = to_tsvector('english', COALESCE(NEW.subject, '') || ' ' || COALESCE(NEW.body, '') || ' ' || COALESCE(NEW.sender_email, '')),
    content_hash = md5(COALESCE(NEW.subject, '') || COALESCE(NEW.body, ''));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email thread updates
DROP TRIGGER IF EXISTS trigger_update_email_thread ON public.email_exchanges;
CREATE TRIGGER trigger_update_email_thread
  AFTER INSERT OR UPDATE ON public.email_exchanges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_thread();

-- Create function to search emails
CREATE OR REPLACE FUNCTION public.search_emails(
  search_query TEXT,
  user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  email_id UUID,
  subject TEXT,
  sender_email TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.subject,
    e.sender_email,
    e.received_at,
    ts_rank(si.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM public.email_exchanges e
  JOIN public.email_search_index si ON e.id = si.email_id
  WHERE 
    e.user_id = user_uuid 
    AND si.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, e.received_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at triggers for all tables
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_threads_updated_at
  BEFORE UPDATE ON public.email_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();