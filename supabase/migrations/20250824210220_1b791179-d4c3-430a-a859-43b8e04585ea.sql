-- Clean up duplicate oauth state tokens and add unique constraint
-- First, delete all tokens (they're temporary anyway)
DELETE FROM public.oauth_state_tokens;

-- Add unique constraint on user_id
ALTER TABLE public.oauth_state_tokens 
ADD CONSTRAINT oauth_state_tokens_user_id_unique UNIQUE (user_id);