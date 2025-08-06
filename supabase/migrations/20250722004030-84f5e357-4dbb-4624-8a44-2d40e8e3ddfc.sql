-- Create table for Gmail push notifications
CREATE TABLE public.gmail_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_address TEXT NOT NULL,
  history_id TEXT NOT NULL,
  notification_data JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable RLS
ALTER TABLE public.gmail_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own gmail notifications"
ON public.gmail_notifications
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own gmail notifications"
ON public.gmail_notifications
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_gmail_notifications_user_id ON public.gmail_notifications(user_id);
CREATE INDEX idx_gmail_notifications_processed ON public.gmail_notifications(processed);
CREATE INDEX idx_gmail_notifications_email_address ON public.gmail_notifications(email_address);