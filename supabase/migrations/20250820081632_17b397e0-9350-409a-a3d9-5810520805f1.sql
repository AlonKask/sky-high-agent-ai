-- COMPREHENSIVE SECURITY FIX: Eliminate ALL public access to sensitive data
-- This addresses critical security findings about publicly readable sensitive tables

-- First, disable RLS temporarily to clean up all policies
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_exchanges DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "clients_delete_own_data_only" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_own_data_only" ON public.clients;
DROP POLICY IF EXISTS "clients_select_own_data_only" ON public.clients;
DROP POLICY IF EXISTS "clients_update_own_data_only" ON public.clients;
DROP POLICY IF EXISTS "block_anonymous_clients_access" ON public.clients;
DROP POLICY IF EXISTS "authenticated_clients_owner_only" ON public.clients;

DROP POLICY IF EXISTS "requests_delete_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_insert_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_select_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_update_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "block_anonymous_requests_access" ON public.requests;
DROP POLICY IF EXISTS "authenticated_requests_access_control" ON public.requests;

DROP POLICY IF EXISTS "quotes_delete_own_data_only" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert_own_data_only" ON public.quotes;
DROP POLICY IF EXISTS "quotes_select_own_data_only" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_own_data_only" ON public.quotes;

DROP POLICY IF EXISTS "bookings_delete_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own_data_only" ON public.bookings;

DROP POLICY IF EXISTS "email_exchanges_delete_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_insert_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_select_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_update_own_data_only" ON public.email_exchanges;

-- Now re-enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_exchanges ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Create comprehensive, secure RLS policies

-- 1. CLIENTS TABLE - Maximum Security
CREATE POLICY "clients_total_lockdown" ON public.clients
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'manager', 'supervisor')
      AND public.can_access_client_data_secure(clients.user_id)
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'manager', 'supervisor')
    )
  )
);

-- 2. REQUESTS TABLE - Secure Access Control
CREATE POLICY "requests_secure_access" ON public.requests
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'manager', 'supervisor')
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'manager', 'supervisor')
    )
  )
);

-- 3. BOOKINGS TABLE - Financial Data Protection
CREATE POLICY "bookings_financial_security" ON public.bookings
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'manager', 'supervisor')
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'manager', 'supervisor')
    )
  )
);

-- 4. QUOTES TABLE - Pricing Protection
CREATE POLICY "quotes_pricing_security" ON public.quotes
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'manager', 'supervisor')
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'manager', 'supervisor')
    )
  )
);

-- 5. EMAIL EXCHANGES - Communication Privacy
CREATE POLICY "emails_communication_security" ON public.email_exchanges
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'manager', 'supervisor')
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'manager', 'supervisor')
    )
  )
);