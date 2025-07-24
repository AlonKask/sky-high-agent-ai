-- Create email archive table for better performance and data management
CREATE TABLE IF NOT EXISTS public.email_archives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id TEXT NOT NULL,
  thread_id TEXT,
  subject TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  archived_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  original_data JSONB NOT NULL,
  folder_name TEXT NOT NULL DEFAULT 'inbox',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for email archives
ALTER TABLE public.email_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own archived emails" 
ON public.email_archives 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own archived emails" 
ON public.email_archives 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own archived emails" 
ON public.email_archives 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_email_archives_user_id ON public.email_archives(user_id);
CREATE INDEX IF NOT EXISTS idx_email_archives_message_id ON public.email_archives(message_id);
CREATE INDEX IF NOT EXISTS idx_email_archives_folder ON public.email_archives(folder_name);

-- Create function to archive old emails automatically
CREATE OR REPLACE FUNCTION public.archive_old_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Archive emails older than 30 days to archives table
  INSERT INTO public.email_archives (
    user_id, message_id, thread_id, subject, sender_email, 
    archived_date, original_data, folder_name
  )
  SELECT 
    user_id, message_id, thread_id, subject, sender_email,
    now(), 
    jsonb_build_object(
      'body', body,
      'recipient_emails', recipient_emails,
      'cc_emails', cc_emails,
      'bcc_emails', bcc_emails,
      'metadata', metadata,
      'attachments', attachments,
      'created_at', created_at
    ),
    CASE 
      WHEN metadata->>'gmail_labels' LIKE '%SENT%' THEN 'sent'
      WHEN metadata->>'gmail_labels' LIKE '%DRAFT%' THEN 'drafts'
      WHEN metadata->>'gmail_labels' LIKE '%SPAM%' THEN 'spam'
      WHEN metadata->>'gmail_labels' LIKE '%TRASH%' THEN 'trash'
      ELSE 'inbox'
    END
  FROM public.email_exchanges 
  WHERE created_at < now() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.email_archives 
    WHERE email_archives.message_id = email_exchanges.message_id
    AND email_archives.user_id = email_exchanges.user_id
  );
  
  -- Delete archived emails from main table
  DELETE FROM public.email_exchanges 
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_email_archives_updated_at
BEFORE UPDATE ON public.email_archives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();