-- FINAL COMPREHENSIVE SECURITY FIX
-- Addressing all 6 critical vulnerabilities with proper RLS policies

-- 1. Fix Customer Personal Information Exposure (clients table)
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Secure admin client emergency access" ON public.clients;

CREATE POLICY "Secure clients access" ON public.clients
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (
      has_admin_role() AND
      check_advanced_rate_limit(auth.uid()::text, 'admin_client_access', 3, 60) = true
    )
  );

CREATE POLICY "Secure clients modification" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Secure clients update" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Secure clients delete" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Fix Financial Records Vulnerability (quotes table)
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Secure manager team quotes access" ON public.quotes;

CREATE POLICY "Secure quotes access" ON public.quotes
  FOR SELECT USING (
    auth.uid() = user_id OR
    (
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN teams t ON t.manager_id = auth.uid()
        JOIN team_members tm ON tm.team_id = t.id
        WHERE tm.user_id = quotes.user_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('manager', 'supervisor', 'admin')
      ) AND
      check_advanced_rate_limit(auth.uid()::text, 'manager_financial_access', 5, 60) = true
    )
  );

-- 3. Fix Travel Booking Information Exposure (bookings table) 
-- First ensure bookings table has RLS enabled
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete their own bookings" ON public.bookings;

CREATE POLICY "Secure bookings access" ON public.bookings
  FOR ALL USING (
    auth.uid() = user_id AND
    validate_session_security()
  ) WITH CHECK (
    auth.uid() = user_id
  );

-- 4. Fix Private Communications Exposure (email_exchanges table)
-- Policies already created in previous migration, ensure they're proper
DROP POLICY IF EXISTS "Secure email exchanges access" ON public.email_exchanges;

CREATE POLICY "Secure email exchanges access" ON public.email_exchanges
  FOR SELECT USING (
    auth.uid() = user_id AND
    validate_session_security()
  );

-- 5. Fix User Profile Information Exposure (profiles table)
-- Profiles table already has ZERO_TRUST policies which are secure

-- 6. Ensure requests table has proper security
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.requests;

CREATE POLICY "Secure requests access" ON public.requests
  FOR ALL USING (
    auth.uid() = user_id
  ) WITH CHECK (
    auth.uid() = user_id
  );

-- Ensure all other sensitive tables have proper RLS
ALTER TABLE public.client_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_credentials ENABLE ROW LEVEL SECURITY;

-- Create simplified but secure policies without complex logging that causes transaction issues
CREATE OR REPLACE FUNCTION public.simple_session_check()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Apply simplified policies to prevent transaction conflicts
DROP POLICY IF EXISTS "Secure client intelligence access" ON public.client_intelligence;
CREATE POLICY "Simple client intelligence access" ON public.client_intelligence
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Secure sales memories access" ON public.sales_memories;  
CREATE POLICY "Simple sales memories access" ON public.sales_memories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Secure gmail credentials read" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Secure gmail credentials write" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Secure gmail credentials update" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Secure gmail credentials delete" ON public.gmail_credentials;

CREATE POLICY "Simple gmail credentials access" ON public.gmail_credentials
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create admin oversight policies with basic rate limiting
CREATE POLICY "Admin emergency bookings access" ON public.bookings
  FOR SELECT USING (
    has_admin_role() AND
    check_rate_limit(auth.uid()::text, 'admin_emergency_bookings', 5, 30) = true
  );

CREATE POLICY "Admin emergency requests access" ON public.requests  
  FOR SELECT USING (
    has_admin_role() AND
    check_rate_limit(auth.uid()::text, 'admin_emergency_requests', 10, 30) = true
  );