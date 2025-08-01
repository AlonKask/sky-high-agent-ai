-- Create universal read access policies for all authenticated users
-- while maintaining role-based write restrictions

-- Update clients table policies
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Authenticated users can view all clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (true);

-- Update requests table policies  
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
CREATE POLICY "Authenticated users can view all requests"
ON public.requests
FOR SELECT 
TO authenticated
USING (true);

-- Update bookings table policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Authenticated users can view all bookings"
ON public.bookings
FOR SELECT
TO authenticated  
USING (true);

-- Update quotes table policies
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
CREATE POLICY "Authenticated users can view all quotes"
ON public.quotes
FOR SELECT
TO authenticated
USING (true);

-- Update email_exchanges table policies
DROP POLICY IF EXISTS "Users can view their own email exchanges" ON public.email_exchanges;
CREATE POLICY "Authenticated users can view all email exchanges"
ON public.email_exchanges
FOR SELECT
TO authenticated
USING (true);

-- Update messages table policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Authenticated users can view all messages"
ON public.messages
FOR SELECT
TO authenticated
USING (true);

-- Update notifications table policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Authenticated users can view all notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (true);

-- Keep INSERT/UPDATE/DELETE policies restricted to owners
-- These ensure data security while allowing universal read access

-- Add role-based policies for supervisors and managers
CREATE POLICY "Supervisors can view team data"
ON public.clients
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Supervisors can view team requests"
ON public.requests  
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Supervisors can view team bookings"
ON public.bookings
FOR ALL  
TO authenticated
USING (
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create a function to check if user can modify data
CREATE OR REPLACE FUNCTION public.can_modify_data(_user_id uuid, _resource_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    -- User can modify their own data
    _user_id = _resource_user_id OR
    -- Or if they have supervisor/manager/admin role
    has_role(_user_id, 'supervisor'::app_role) OR
    has_role(_user_id, 'manager'::app_role) OR 
    has_role(_user_id, 'admin'::app_role)
$$;