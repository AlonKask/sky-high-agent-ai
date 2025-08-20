-- PHASE 1: CRITICAL RLS POLICY CONSOLIDATION
-- Remove all conflicting RLS policies and implement secure single policies

-- Drop all existing conflicting policies on bookings table
DROP POLICY IF EXISTS "bookings_delete_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own_data_only" ON public.bookings;

-- Drop all existing conflicting policies on email_exchanges table  
DROP POLICY IF EXISTS "email_exchanges_delete_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_insert_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_select_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_update_own_data_only" ON public.email_exchanges;

-- Drop all existing conflicting policies on requests table
DROP POLICY IF EXISTS "requests_delete_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_insert_own_data_only" ON public.requests;  
DROP POLICY IF EXISTS "requests_select_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_update_own_data_only" ON public.requests;

-- Create consolidated, secure RLS policies for bookings
CREATE POLICY "secure_bookings_access" 
ON public.bookings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create consolidated, secure RLS policies for email_exchanges
CREATE POLICY "secure_emails_access"
ON public.email_exchanges FOR ALL  
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create consolidated, secure RLS policies for requests
CREATE POLICY "secure_requests_access"
ON public.requests FOR ALL
USING (auth.uid() = user_id OR auth.uid() = assigned_to)
WITH CHECK (auth.uid() = user_id);

-- Enhanced security function for admin access with audit logging
CREATE OR REPLACE FUNCTION public.admin_access_with_audit(
  p_table_name text,
  p_record_id uuid,
  p_justification text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Only admins can use this function
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  IF user_role != 'admin' THEN
    RETURN false;
  END IF;
  
  -- Require detailed justification
  IF p_justification IS NULL OR length(trim(p_justification)) < 20 THEN
    RETURN false;
  END IF;
  
  -- Log the admin access as critical event
  PERFORM public.log_security_event(
    'admin_override_access',
    'critical',
    jsonb_build_object(
      'admin_id', auth.uid(),
      'table_name', p_table_name,
      'record_id', p_record_id,
      'justification', p_justification,
      'timestamp', now(),
      'requires_review', true
    )
  );
  
  RETURN true;
END;
$$;