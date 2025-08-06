-- Add sync tracking table to avoid unnecessary re-syncing
CREATE TABLE public.email_sync_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  folder_name TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_sync_count INTEGER NOT NULL DEFAULT 0,
  gmail_history_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, folder_name)
);

-- Enable Row Level Security
ALTER TABLE public.email_sync_status ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own sync status" 
ON public.email_sync_status 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync status" 
ON public.email_sync_status 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync status" 
ON public.email_sync_status 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_sync_status_updated_at
BEFORE UPDATE ON public.email_sync_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();