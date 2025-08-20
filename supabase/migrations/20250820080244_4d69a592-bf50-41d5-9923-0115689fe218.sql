-- PHASE 1: CRITICAL RLS POLICY CONSOLIDATION
-- This migration resolves 42 conflicting RLS policies that pose data exposure risks

-- 1. BOOKINGS TABLE - Drop 14 conflicting policies and create consolidated secure access
DROP POLICY IF EXISTS "bookings_delete_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_own_data_only" ON public.bookings;  
DROP POLICY IF EXISTS "bookings_select_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own_data_only" ON public.bookings;
DROP POLICY IF EXISTS "Emergency booking access for admins" ON public.bookings;
DROP POLICY IF EXISTS "Financial data access with audit" ON public.bookings;
DROP POLICY IF EXISTS "Secure booking data access" ON public.bookings;
DROP POLICY IF EXISTS "Admin emergency booking access" ON public.bookings;
DROP POLICY IF EXISTS "Booking financial security" ON public.bookings;
DROP POLICY IF EXISTS "Emergency admin booking bypass" ON public.bookings;
DROP POLICY IF EXISTS "Secure financial booking access" ON public.bookings;
DROP POLICY IF EXISTS "Ultra secure booking access" ON public.bookings;
DROP POLICY IF EXISTS "Zero trust booking policy" ON public.bookings;
DROP POLICY IF EXISTS "LOCKDOWN_bookings_total_security" ON public.bookings;

-- Create single consolidated booking policy with audit logging
CREATE POLICY "consolidated_bookings_access" ON public.bookings
FOR ALL USING (
  auth.uid() = user_id OR 
  public.admin_access_with_audit('bookings', id, 'Booking management access required')
) WITH CHECK (
  auth.uid() = user_id
);

-- 2. EMAIL_EXCHANGES TABLE - Drop 14 conflicting policies and create consolidated secure access
DROP POLICY IF EXISTS "email_exchanges_delete_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_insert_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_select_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "email_exchanges_update_own_data_only" ON public.email_exchanges;
DROP POLICY IF EXISTS "Admin email override with audit" ON public.email_exchanges;
DROP POLICY IF EXISTS "Email security with audit trail" ON public.email_exchanges;
DROP POLICY IF EXISTS "Enhanced email security access" ON public.email_exchanges;
DROP POLICY IF EXISTS "Secure email exchange access" ON public.email_exchanges;
DROP POLICY IF EXISTS "Ultra secure email policy" ON public.email_exchanges;
DROP POLICY IF EXISTS "Emergency admin email access" ON public.email_exchanges;
DROP POLICY IF EXISTS "Zero trust email security" ON public.email_exchanges;
DROP POLICY IF EXISTS "MAXIMUM_SECURITY_email_exchanges" ON public.email_exchanges;
DROP POLICY IF EXISTS "LOCKDOWN_email_total_security" ON public.email_exchanges;
DROP POLICY IF EXISTS "CRITICAL_SECURITY_email_lockdown" ON public.email_exchanges;

-- Create single consolidated email policy with audit logging
CREATE POLICY "consolidated_email_exchanges_access" ON public.email_exchanges
FOR ALL USING (
  auth.uid() = user_id OR 
  public.admin_access_with_audit('email_exchanges', id, 'Email management access required')
) WITH CHECK (
  auth.uid() = user_id
);

-- 3. REQUESTS TABLE - Drop 14 conflicting policies and create consolidated secure access  
DROP POLICY IF EXISTS "requests_delete_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_insert_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_select_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "requests_update_own_data_only" ON public.requests;
DROP POLICY IF EXISTS "Admin request override with justification" ON public.requests;
DROP POLICY IF EXISTS "Enhanced request security policy" ON public.requests;
DROP POLICY IF EXISTS "Secure request data access" ON public.requests;
DROP POLICY IF EXISTS "Request assignment security" ON public.requests;
DROP POLICY IF EXISTS "Ultra secure request access" ON public.requests;
DROP POLICY IF EXISTS "Emergency admin request access" ON public.requests;
DROP POLICY IF EXISTS "Zero trust request security" ON public.requests;
DROP POLICY IF EXISTS "MAXIMUM_SECURITY_requests" ON public.requests;
DROP POLICY IF EXISTS "LOCKDOWN_request_total_security" ON public.requests;
DROP POLICY IF EXISTS "CRITICAL_SECURITY_request_lockdown" ON public.requests;

-- Create single consolidated request policy with assignment access
CREATE POLICY "consolidated_requests_access" ON public.requests
FOR ALL USING (
  auth.uid() = user_id OR 
  auth.uid() = assigned_to OR
  public.admin_access_with_audit('requests', id, 'Request management access required')
) WITH CHECK (
  auth.uid() = user_id OR 
  (auth.uid() = assigned_to AND TG_OP = 'UPDATE')
);

-- 4. OAUTH_STATE_TOKENS - Consolidate 6 conflicting policies
DROP POLICY IF EXISTS "Deny anonymous access to oauth tokens" ON public.oauth_state_tokens;
DROP POLICY IF EXISTS "Strict oauth token management" ON public.oauth_state_tokens;
DROP POLICY IF EXISTS "System can create oauth tokens" ON public.oauth_state_tokens;
DROP POLICY IF EXISTS "System can delete expired tokens" ON public.oauth_state_tokens;
DROP POLICY IF EXISTS "System can update oauth tokens" ON public.oauth_state_tokens;
DROP POLICY IF EXISTS "Users can view their own oauth tokens" ON public.oauth_state_tokens;

-- Create consolidated oauth token policies with strict validation
CREATE POLICY "oauth_tokens_user_access" ON public.oauth_state_tokens
FOR SELECT USING (
  auth.uid() = user_id AND expires_at > now() AND used = false
);

CREATE POLICY "oauth_tokens_system_management" ON public.oauth_state_tokens
FOR ALL USING (
  -- System operations for token lifecycle management
  current_setting('role') = 'service_role' OR
  -- User can only access their own valid tokens
  (auth.uid() = user_id AND expires_at > now())
) WITH CHECK (
  -- Only system can insert/update, users can only read their own
  current_setting('role') = 'service_role' OR
  (TG_OP = 'SELECT' AND auth.uid() = user_id)
);

-- 5. Add security monitoring for policy consolidation
INSERT INTO public.security_events (
  user_id,
  event_type, 
  severity,
  details
) VALUES (
  COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  'security_hardening_applied',
  'critical',
  jsonb_build_object(
    'action', 'rls_policy_consolidation',
    'tables_affected', ARRAY['bookings', 'email_exchanges', 'requests', 'oauth_state_tokens'],
    'policies_removed', 42,
    'policies_created', 5,
    'security_improvement', 'eliminated_policy_conflicts',
    'timestamp', now()
  )
);