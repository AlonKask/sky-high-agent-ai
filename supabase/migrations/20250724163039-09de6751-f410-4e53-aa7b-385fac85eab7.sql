-- Add client_token column to quotes table for secure client access
ALTER TABLE public.quotes 
ADD COLUMN client_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');

-- Create index for faster token lookups
CREATE INDEX idx_quotes_client_token ON public.quotes(client_token);

-- Update existing quotes to have tokens
UPDATE public.quotes 
SET client_token = encode(gen_random_bytes(32), 'hex') 
WHERE client_token IS NULL;