-- Create table for email exchanges
CREATE TABLE public.email_exchanges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_id UUID,
  client_id UUID,
  message_id TEXT, -- Gmail message ID for tracking
  thread_id TEXT, -- Gmail thread ID for grouping
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  recipient_emails TEXT[] NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'failed', 'delivered')),
  email_type TEXT DEFAULT 'quote' CHECK (email_type IN ('quote', 'follow_up', 'confirmation', 'general', 'booking_update')),
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_exchanges ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own email exchanges" 
ON public.email_exchanges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email exchanges" 
ON public.email_exchanges 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email exchanges" 
ON public.email_exchanges 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email exchanges" 
ON public.email_exchanges 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_email_exchanges_updated_at
BEFORE UPDATE ON public.email_exchanges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_email_exchanges_user_id ON public.email_exchanges(user_id);
CREATE INDEX idx_email_exchanges_request_id ON public.email_exchanges(request_id);
CREATE INDEX idx_email_exchanges_client_id ON public.email_exchanges(client_id);
CREATE INDEX idx_email_exchanges_thread_id ON public.email_exchanges(thread_id);
CREATE INDEX idx_email_exchanges_created_at ON public.email_exchanges(created_at DESC);