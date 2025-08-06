-- Add segments column to requests table for multi-city trips
ALTER TABLE public.requests 
ADD COLUMN segments JSONB DEFAULT '[]'::jsonb;