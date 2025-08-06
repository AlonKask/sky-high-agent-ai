-- Add passenger breakdown fields to requests table
ALTER TABLE public.requests 
ADD COLUMN adults_count integer DEFAULT 1,
ADD COLUMN children_count integer DEFAULT 0,
ADD COLUMN infants_count integer DEFAULT 0;

-- Update existing records to have adults_count = passengers
UPDATE public.requests 
SET adults_count = passengers 
WHERE adults_count IS NULL;

-- Add passenger pricing breakdown to quotes table
ALTER TABLE public.quotes
ADD COLUMN adults_count integer DEFAULT 1,
ADD COLUMN children_count integer DEFAULT 0,
ADD COLUMN infants_count integer DEFAULT 0,
ADD COLUMN passenger_pricing jsonb DEFAULT '{}'::jsonb;

-- Update existing quotes to have adults_count = total_segments (assuming 1 adult per segment for now)
UPDATE public.quotes 
SET adults_count = 1 
WHERE adults_count IS NULL;