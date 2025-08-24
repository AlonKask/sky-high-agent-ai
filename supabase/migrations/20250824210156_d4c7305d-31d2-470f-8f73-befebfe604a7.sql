-- Add unique constraint on user_id for oauth_state_tokens
-- This ensures each user can only have one active state token
ALTER TABLE public.oauth_state_tokens 
ADD CONSTRAINT oauth_state_tokens_user_id_unique UNIQUE (user_id);