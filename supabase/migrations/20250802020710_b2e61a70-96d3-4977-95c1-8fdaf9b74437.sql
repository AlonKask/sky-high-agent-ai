-- Add passenger-specific net price columns to quotes table
ALTER TABLE public.quotes 
ADD COLUMN adult_net_price numeric DEFAULT 0,
ADD COLUMN child_net_price numeric DEFAULT 0,
ADD COLUMN infant_net_price numeric DEFAULT 0;