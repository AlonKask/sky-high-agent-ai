-- Fix constraint syntax and complete user sessions table setup

-- Add unique constraint for session tokens (correct syntax)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_sessions_session_token_key'
    ) THEN
        ALTER TABLE public.user_sessions 
        ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);
    END IF;
END $$;