-- Add missing fields to quotes table for SabreOptionManager compatibility
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS content text,
ADD COLUMN IF NOT EXISTS format text DEFAULT 'I' CHECK (format IN ('I', 'VI')),
ADD COLUMN IF NOT EXISTS quote_type text DEFAULT 'revenue' CHECK (quote_type IN ('revenue', 'award')),
ADD COLUMN IF NOT EXISTS adult_price numeric,
ADD COLUMN IF NOT EXISTS child_price numeric,
ADD COLUMN IF NOT EXISTS infant_price numeric,
ADD COLUMN IF NOT EXISTS number_of_bags integer,
ADD COLUMN IF NOT EXISTS weight_of_bags numeric,
ADD COLUMN IF NOT EXISTS award_program text,
ADD COLUMN IF NOT EXISTS number_of_points integer,
ADD COLUMN IF NOT EXISTS taxes numeric,
ADD COLUMN IF NOT EXISTS minimum_markup numeric,
ADD COLUMN IF NOT EXISTS issuing_fee numeric;

-- Update existing records to have default format and quote_type if null
UPDATE public.quotes 
SET format = 'I' WHERE format IS NULL;

UPDATE public.quotes 
SET quote_type = 'revenue' WHERE quote_type IS NULL;