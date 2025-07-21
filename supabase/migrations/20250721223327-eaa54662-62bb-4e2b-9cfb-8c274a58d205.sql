-- Add date_of_birth field to clients table
ALTER TABLE public.clients 
ADD COLUMN date_of_birth DATE;