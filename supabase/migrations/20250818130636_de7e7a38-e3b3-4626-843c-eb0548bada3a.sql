-- Phase 2b: Fix function conflicts and complete security setup
-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.secure_financial_data_access(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.secure_communication_access(UUID) CASCADE;

-- Create function for secure financial data access
CREATE OR REPLACE FUNCTION public.secure_financial_data_access(booking_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id UUID := auth.uid();
  booking_owner_id UUID;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get booking owner
  SELECT user_id INTO booking_owner_id
  FROM public.bookings
  WHERE id = booking_id;
  
  -- Allow users to access their own booking data
  IF accessing_user_id = booking_owner_id THEN
    RETURN true;
  END IF;
  
  -- For now, deny all other access
  RETURN false;
END;
$$;

-- Create function for secure communication access
CREATE OR REPLACE FUNCTION public.secure_communication_access(email_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id UUID := auth.uid();
  email_owner_id UUID;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get email owner
  SELECT user_id INTO email_owner_id
  FROM public.email_exchanges
  WHERE id = email_id;
  
  -- Allow users to access their own email data
  IF accessing_user_id = email_owner_id THEN
    RETURN true;
  END IF;
  
  -- For now, deny all other access
  RETURN false;
END;
$$;