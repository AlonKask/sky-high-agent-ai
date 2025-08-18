-- Phase 2: Complete security improvements and create user role assignment
-- Create missing validation functions that were referenced in RLS policies

-- Create basic session security validation function
CREATE OR REPLACE FUNCTION public.validate_session_security()
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Simple session validation - just check if user is authenticated
  RETURN auth.uid() IS NOT NULL;
END;
$$;

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

-- Update RLS policies for bookings table to use the new function
DROP POLICY IF EXISTS "Users can manage their own bookings" ON public.bookings;
CREATE POLICY "Secure bookings access" 
ON public.bookings 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND secure_financial_data_access(id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Update RLS policies for email_exchanges table
DROP POLICY IF EXISTS "Users can manage their own emails" ON public.email_exchanges;
CREATE POLICY "Secure email communications access" 
ON public.email_exchanges 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND secure_communication_access(id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Create a simple function to assign user roles (for admin use)
CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id UUID, new_role app_role)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role app_role;
BEGIN
  -- Only allow admins to assign roles
  SELECT role INTO current_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can assign user roles';
  END IF;
  
  -- Insert or update user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    role = new_role,
    updated_at = now();
  
  RETURN true;
END;
$$;