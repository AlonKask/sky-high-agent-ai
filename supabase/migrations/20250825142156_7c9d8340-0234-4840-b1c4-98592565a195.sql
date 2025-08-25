-- Simple and safe email data cleanup
-- Temporarily disable triggers to avoid foreign key issues during cleanup

-- Delete all email exchanges
TRUNCATE public.email_exchanges CASCADE;

-- Delete email sync status records if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_sync_status') THEN
        TRUNCATE public.email_sync_status CASCADE;
    END IF;
END $$;

-- Delete AI email data
TRUNCATE public.ai_email_messages CASCADE;
TRUNCATE public.ai_email_conversations CASCADE; 
TRUNCATE public.ai_email_drafts CASCADE;
TRUNCATE public.ai_email_analytics CASCADE;

-- Clean up email archives if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_archives') THEN
        TRUNCATE public.email_archives CASCADE;
    END IF;
END $$;