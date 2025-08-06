
-- Create table for AI email assistant conversations
CREATE TABLE IF NOT EXISTS public.ai_email_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AI email assistant messages
CREATE TABLE IF NOT EXISTS public.ai_email_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.ai_email_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AI email drafts
CREATE TABLE IF NOT EXISTS public.ai_email_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  conversation_id UUID REFERENCES public.ai_email_conversations(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_emails TEXT[] NOT NULL,
  cc_emails TEXT[] DEFAULT '{}',
  bcc_emails TEXT[] DEFAULT '{}',
  email_type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'scheduled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AI email analytics
CREATE TABLE IF NOT EXISTS public.ai_email_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  conversation_id UUID REFERENCES public.ai_email_conversations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) policies
ALTER TABLE public.ai_email_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_email_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_email_conversations
CREATE POLICY "Users can view their own conversations" 
  ON public.ai_email_conversations 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
  ON public.ai_email_conversations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
  ON public.ai_email_conversations 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
  ON public.ai_email_conversations 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for ai_email_messages
CREATE POLICY "Users can view their own messages" 
  ON public.ai_email_messages 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages" 
  ON public.ai_email_messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages" 
  ON public.ai_email_messages 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" 
  ON public.ai_email_messages 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for ai_email_drafts
CREATE POLICY "Users can view their own drafts" 
  ON public.ai_email_drafts 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts" 
  ON public.ai_email_drafts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts" 
  ON public.ai_email_drafts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts" 
  ON public.ai_email_drafts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for ai_email_analytics
CREATE POLICY "Users can view their own analytics" 
  ON public.ai_email_analytics 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analytics" 
  ON public.ai_email_analytics 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_email_conversations_user_id ON public.ai_email_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_email_conversations_created_at ON public.ai_email_conversations(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_email_messages_conversation_id ON public.ai_email_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_email_messages_user_id ON public.ai_email_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_email_messages_created_at ON public.ai_email_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_email_drafts_user_id ON public.ai_email_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_email_drafts_conversation_id ON public.ai_email_drafts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_email_drafts_status ON public.ai_email_drafts(status);

CREATE INDEX IF NOT EXISTS idx_ai_email_analytics_user_id ON public.ai_email_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_email_analytics_timestamp ON public.ai_email_analytics(timestamp);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_email_conversations_updated_at 
    BEFORE UPDATE ON public.ai_email_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_email_drafts_updated_at 
    BEFORE UPDATE ON public.ai_email_drafts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for conversation cleanup
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete conversations older than 90 days with no activity
  DELETE FROM public.ai_email_conversations 
  WHERE updated_at < NOW() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.ai_email_messages 
    WHERE conversation_id = ai_email_conversations.id 
    AND created_at > NOW() - INTERVAL '30 days'
  );
END;
$$;
