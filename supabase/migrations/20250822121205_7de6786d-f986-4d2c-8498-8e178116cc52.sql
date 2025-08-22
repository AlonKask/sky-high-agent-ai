-- Expand client_type to support referral and repeat types
ALTER TABLE public.clients 
DROP CONSTRAINT IF EXISTS clients_client_type_check;

ALTER TABLE public.clients 
ADD CONSTRAINT clients_client_type_check 
CHECK (client_type IN ('new', 'return', 'referral', 'repeat'));