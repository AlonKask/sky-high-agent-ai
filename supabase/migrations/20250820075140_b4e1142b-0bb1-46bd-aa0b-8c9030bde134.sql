-- Phase 1: Critical RLS Policy Consolidation (Core fixes only)
-- Remove all conflicting policies and implement clean, secure access controls

-- 1. Clean up bookings table RLS policies
DROP POLICY IF EXISTS "Bookings access control" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "Enhanced bookings access" ON public.bookings;
DROP POLICY IF EXISTS "Enhanced secure bookings access" ON public.bookings;
DROP POLICY IF EXISTS "Secure bookings access control" ON public.bookings;
DROP POLICY IF EXISTS "Ultra secure bookings access" ON public.bookings;
DROP POLICY IF EXISTS "Users can manage their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings emergency admin access" ON public.bookings;
DROP POLICY IF EXISTS "Admin bookings override" ON public.bookings;

-- Create consolidated bookings RLS policies
CREATE POLICY "bookings_users_own_data_only"
ON public.bookings FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Clean up email_exchanges table RLS policies  
DROP POLICY IF EXISTS "Email exchanges access control" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_delete_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_insert_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_select_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_update_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "Enhanced email exchanges access" ON public.email_exchanges;
DROP POLICY IF EXISTS "Enhanced secure email exchanges access" ON public.email_exchanges;
DROP POLICY IF EXISTS "Secure email exchanges access control" ON public.email_exchanges;
DROP POLICY IF EXISTS "Ultra secure email exchanges access" ON public.email_exchanges;
DROP POLICY IF EXISTS "Users can manage their own emails" ON public.email_exchanges;
DROP POLICY IF EXISTS "Email emergency admin access" ON public.email_exchanges;
DROP POLICY IF EXISTS "Admin email override" ON public.email_exchanges;

-- Create consolidated email_exchanges RLS policies
CREATE POLICY "email_exchanges_users_own_data_only"
ON public.email_exchanges FOR ALL
TO authenticated  
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Clean up requests table RLS policies
DROP POLICY IF EXISTS "Requests access control" ON public.requests;
DROP POLICY IF EXISTS "requests_delete_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_insert_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_select_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_update_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "Enhanced requests access" ON public.requests;
DROP POLICY IF EXISTS "Enhanced secure requests access" ON public.requests;
DROP POLICY IF EXISTS "Secure requests access control" ON public.requests;
DROP POLICY IF EXISTS "Ultra secure requests access" ON public.requests;
DROP POLICY IF EXISTS "Users can manage their own requests" ON public.requests;
DROP POLICY IF EXISTS "Requests emergency admin access" ON public.requests;
DROP POLICY IF EXISTS "Admin requests override" ON public.requests;

-- Create consolidated requests RLS policies
CREATE POLICY "requests_users_own_data_only"
ON public.requests FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);