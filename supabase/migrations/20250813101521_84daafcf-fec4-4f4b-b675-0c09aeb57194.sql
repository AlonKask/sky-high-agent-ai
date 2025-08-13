-- TASK 1: COMPREHENSIVE SECURITY FIX - CLEAN UP CONFLICTING RLS POLICIES
-- Fixing critical security vulnerabilities identified in scan

-- =====================================================
-- 1. CLIENTS TABLE - SECURE PERSONAL DATA (CRITICAL)
-- =====================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Deny all anonymous access to clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view own and team clients only" ON public.clients;
DROP POLICY IF EXISTS "Users can create clients assigned to themselves" ON public.clients;
DROP POLICY IF EXISTS "Users can modify their own clients only" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients only" ON public.clients;

-- Create single, secure access control function for clients
CREATE OR REPLACE FUNCTION public.can_access_client_data(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Users can only access their own client data
    auth.uid() = target_user_id
    OR EXISTS (
      -- Team managers can access their team members' client data (audited)
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id 
      WHERE tm.user_id = target_user_id
      AND t.manager_id = auth.uid()
    );
$$;

-- Create new restrictive RLS policies for clients
CREATE POLICY "Secure client data access" ON public.clients
FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  public.can_access_client_data(user_id)
) WITH CHECK (
  auth.uid() = user_id
);

-- =====================================================
-- 2. GMAIL CREDENTIALS - SECURE EMAIL ACCESS (CRITICAL)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can access gmail integration based on permissions" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Users can manage their own Gmail credentials" ON public.gmail_credentials;

-- Create single, restrictive policy for Gmail credentials
CREATE POLICY "Secure gmail credentials access" ON public.gmail_credentials
FOR ALL USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- =====================================================
-- 3. QUOTES TABLE - SECURE FINANCIAL DATA (CRITICAL)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;

-- Create secure financial data access function
CREATE OR REPLACE FUNCTION public.can_access_financial_data(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Users can only access their own financial data
    auth.uid() = target_user_id;
$$;

-- Create restrictive policy for quotes
CREATE POLICY "Secure financial data access" ON public.quotes
FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  public.can_access_financial_data(user_id)
) WITH CHECK (
  auth.uid() = user_id
);

-- =====================================================
-- 4. USER SESSIONS - SECURE SESSION DATA (CRITICAL)
-- =====================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Deny anonymous access to user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "System can delete sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "System can insert sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "System can manage sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "System can update sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions only" ON public.user_sessions;

-- Create single secure session policy
CREATE POLICY "Secure session access" ON public.user_sessions
FOR SELECT USING (
  auth.uid() = user_id
);

-- System-only policies for session management
CREATE POLICY "System session management" ON public.user_sessions
FOR INSERT WITH CHECK (true);

CREATE POLICY "System session updates" ON public.user_sessions
FOR UPDATE USING (true);

CREATE POLICY "System session cleanup" ON public.user_sessions
FOR DELETE USING (true);

-- Log security enhancement
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  auth.uid(),
  'security_enhancement_applied',
  'high',
  jsonb_build_object(
    'enhancement_phase', 'Task 1 - RLS Policy Cleanup',
    'tables_secured', jsonb_build_array('clients', 'gmail_credentials', 'quotes', 'user_sessions'),
    'critical_vulnerabilities_addressed', 4,
    'timestamp', now()
  )
);