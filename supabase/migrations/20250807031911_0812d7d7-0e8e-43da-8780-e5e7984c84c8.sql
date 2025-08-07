-- Add priority field to airport_codes table for city-based ranking
ALTER TABLE public.airport_codes 
ADD COLUMN priority integer NOT NULL DEFAULT 1;

-- Add index for better performance on city + priority queries
CREATE INDEX idx_airport_codes_city_priority ON public.airport_codes(city, priority DESC);