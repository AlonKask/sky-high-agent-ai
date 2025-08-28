-- Add html_body field to email_exchanges table for preserving original HTML content
ALTER TABLE public.email_exchanges 
ADD COLUMN html_body text;

-- Add index for better performance when querying HTML content
CREATE INDEX idx_email_exchanges_html_body_exists ON public.email_exchanges (user_id) WHERE html_body IS NOT NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN public.email_exchanges.html_body IS 'Original HTML content from Gmail API - preserves formatting, images, and styling';