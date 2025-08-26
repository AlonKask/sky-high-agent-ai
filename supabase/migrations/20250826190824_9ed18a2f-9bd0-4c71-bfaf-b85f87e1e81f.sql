-- Step 1: Add foreign key constraint for email_exchanges.client_id -> clients.id
-- This will establish the relationship that Supabase needs for joins

-- First, ensure any orphaned records have client_id set to NULL
UPDATE public.email_exchanges 
SET client_id = NULL 
WHERE client_id IS NOT NULL 
AND client_id NOT IN (SELECT id FROM public.clients);

-- Add the foreign key constraint
ALTER TABLE public.email_exchanges 
ADD CONSTRAINT fk_email_exchanges_client_id 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_email_exchanges_client_id ON public.email_exchanges(client_id);

-- Add an index for email matching by sender email
CREATE INDEX IF NOT EXISTS idx_email_exchanges_sender_email ON public.email_exchanges(sender_email);