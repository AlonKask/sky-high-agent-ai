-- PHASE 1: CRITICAL RLS POLICY CONSOLIDATION (SIMPLE VERSION)
-- This migration resolves conflicting RLS policies that pose data exposure risks

-- 1. BOOKINGS TABLE - Drop conflicting policies and create consolidated secure access
DROP POLICY IF EXISTS "bookings_delete_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_own_data_only" ON public.bookings;  
DROP POLICY IF EXISTS "bookings_select_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own_data_only" ON public.bookings;

-- Create single consolidated booking policy
CREATE POLICY "consolidated_bookings_access" ON public.bookings
FOR ALL USING (
  auth.uid() = user_id OR 
  public.admin_access_with_audit('bookings', id, 'Booking management access required')
) WITH CHECK (
  auth.uid() = user_id
);

-- 2. EMAIL_EXCHANGES TABLE - Drop conflicting policies and create consolidated secure access
DROP POLICY IF EXISTS "email_exchanges_delete_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_insert_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_select_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_update_own_data_only" ON public.email_exchanges;

-- Create single consolidated email policy
CREATE POLICY "consolidated_email_exchanges_access" ON public.email_exchanges
FOR ALL USING (
  auth.uid() = user_id OR 
  public.admin_access_with_audit('email_exchanges', id, 'Email management access required')
) WITH CHECK (
  auth.uid() = user_id
);

-- 3. REQUESTS TABLE - Drop conflicting policies and create consolidated secure access  
DROP POLICY IF EXISTS "requests_delete_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_insert_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_select_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_update_own_data_only" ON public.requests;

-- Create single consolidated request policy
CREATE POLICY "consolidated_requests_access" ON public.requests
FOR ALL USING (
  auth.uid() = user_id OR 
  auth.uid() = assigned_to OR
  public.admin_access_with_audit('requests', id, 'Request management access required')
) WITH CHECK (
  auth.uid() = user_id OR auth.uid() = assigned_to
);

-- 4. OAUTH_STATE_TOKENS - Consolidate conflicting policies
DROP POLICY IF EXISTS "Deny anonymous access to oauth tokens" ON public.oauth_state_tokens;
DROP POLICY IF EXISTS "Strict oauth token management" ON public.oauth_state_tokens;
DROP POLICY IF EXISTS "System can create oauth tokens" ON public.oauth_state_tokens;
DROP POLICY IF EXISTS "System can delete expired tokens" ON public.oauth_state_tokens;
DROP POLICY IF EXISTS "System can update oauth tokens" ON public.oauth_state_tokens;
DROP POLICY IF EXISTS "Users can view their own oauth tokens" ON public.oauth_state_tokens;

-- Create consolidated oauth token policies
CREATE POLICY "oauth_tokens_secure_access" ON public.oauth_state_tokens
FOR ALL USING (
  current_setting('role') = 'service_role' OR
  (auth.uid() = user_id AND expires_at > now())
) WITH CHECK (
  current_setting('role') = 'service_role'
);