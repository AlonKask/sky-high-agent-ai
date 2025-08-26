-- Update the email_exchanges table check constraint to include 'gmail' as a valid email type
ALTER TABLE public.email_exchanges 
DROP CONSTRAINT IF EXISTS email_exchanges_email_type_check;

-- Add the updated constraint with 'gmail' included
ALTER TABLE public.email_exchanges 
ADD CONSTRAINT email_exchanges_email_type_check 
CHECK (email_type IN ('quote', 'follow_up', 'confirmation', 'general', 'booking_update', 'gmail'));