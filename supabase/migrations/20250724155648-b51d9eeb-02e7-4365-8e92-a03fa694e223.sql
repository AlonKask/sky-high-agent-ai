-- Add received_at column to email_exchanges table
ALTER TABLE public.email_exchanges 
ADD COLUMN received_at timestamp with time zone DEFAULT now();

-- Update existing records to use created_at for received_at
UPDATE public.email_exchanges 
SET received_at = created_at 
WHERE received_at IS NULL;