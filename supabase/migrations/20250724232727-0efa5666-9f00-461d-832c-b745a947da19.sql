-- Create client option reviews table
CREATE TABLE public.client_option_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  request_id UUID NOT NULL,
  quote_ids UUID[] NOT NULL DEFAULT '{}',
  client_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'feedback_provided', 'closed')),
  viewed_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  client_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days')
);

-- Create option feedback table
CREATE TABLE public.option_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL,
  quote_id UUID NOT NULL,
  client_id UUID NOT NULL,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('interested', 'not_interested', 'need_changes', 'booked')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  price_feedback TEXT CHECK (price_feedback IN ('too_expensive', 'reasonable', 'good_value')),
  convenience_rating INTEGER CHECK (convenience_rating >= 1 AND convenience_rating <= 5),
  comments TEXT,
  suggested_changes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent client chat table
CREATE TABLE public.agent_client_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('agent', 'client')),
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'quote_reference')),
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  read_by_agent BOOLEAN NOT NULL DEFAULT false,
  read_by_client BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for client_option_reviews
ALTER TABLE public.client_option_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own option reviews"
ON public.client_option_reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own option reviews"
ON public.client_option_reviews
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own option reviews"
ON public.client_option_reviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Add RLS policies for option_feedback
ALTER TABLE public.option_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback for their options"
ON public.option_feedback
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create feedback"
ON public.option_feedback
FOR INSERT
WITH CHECK (true);

-- Add RLS policies for agent_client_chat
ALTER TABLE public.agent_client_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chat for their reviews"
ON public.agent_client_chat
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create chat messages"
ON public.agent_client_chat
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their chat messages"
ON public.agent_client_chat
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_client_option_reviews_client_token ON public.client_option_reviews(client_token);
CREATE INDEX idx_client_option_reviews_user_client ON public.client_option_reviews(user_id, client_id);
CREATE INDEX idx_option_feedback_review_id ON public.option_feedback(review_id);
CREATE INDEX idx_option_feedback_quote_id ON public.option_feedback(quote_id);
CREATE INDEX idx_agent_client_chat_review_id ON public.agent_client_chat(review_id);
CREATE INDEX idx_agent_client_chat_created_at ON public.agent_client_chat(created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_client_option_reviews_updated_at
  BEFORE UPDATE ON public.client_option_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for chat
ALTER TABLE public.agent_client_chat REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.agent_client_chat;