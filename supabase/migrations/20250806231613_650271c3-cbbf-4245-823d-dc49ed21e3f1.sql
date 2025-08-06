-- Fix missing foreign key relationship and consolidate RBD data structure
-- This will resolve the "Could not find a relationship" error

-- Add the missing foreign key constraint
ALTER TABLE public.airline_rbd_assignments 
ADD CONSTRAINT fk_airline_rbd_assignments_airline_id 
FOREIGN KEY (airline_id) REFERENCES public.airline_codes(id) ON DELETE CASCADE;