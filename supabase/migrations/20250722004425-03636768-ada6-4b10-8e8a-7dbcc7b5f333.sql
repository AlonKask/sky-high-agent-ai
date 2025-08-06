-- Add indexes for better email query performance
CREATE INDEX IF NOT EXISTS idx_email_exchanges_user_created 
ON public.email_exchanges(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_exchanges_message_user 
ON public.email_exchanges(message_id, user_id);

CREATE INDEX IF NOT EXISTS idx_email_exchanges_search 
ON public.email_exchanges USING gin(to_tsvector('english', subject || ' ' || body || ' ' || sender_email));

-- Add updated_at trigger for email_exchanges if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_email_exchanges_updated_at') THEN
        CREATE TRIGGER update_email_exchanges_updated_at
        BEFORE UPDATE ON public.email_exchanges
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END$$;