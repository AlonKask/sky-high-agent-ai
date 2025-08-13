-- First fix the security_events constraint to allow new event types
ALTER TABLE public.security_events 
DROP CONSTRAINT IF EXISTS security_events_event_type_check;

-- Add the new constraint with all required event types
ALTER TABLE public.security_events 
ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type IN (
  'login_attempt', 'login_success', 'login_failure', 'logout', 
  'password_change', 'email_change', 'mfa_enabled', 'mfa_disabled',
  'suspicious_activity', 'data_access', 'unauthorized_access', 'admin_action',
  'token_refresh', 'session_timeout', 'account_locked', 'account_unlocked',
  'data_export', 'data_deletion', 'permission_escalation', 'security_breach',
  'sensitive_data_access', 'sensitive_data_modified', 'unauthorized_access_attempt',
  'client_sensitive_modified', 'cross_user_client_access', 'emergency_client_access_granted',
  'admin_client_data_access', 'manager_team_client_access', 'supervisor_team_client_access',
  'unauthorized_client_access_attempt', 'audit_data_accessed', 'option_review_token_generated',
  'option_token_accessed', 'option_token_access_denied', 'invalid_option_token_attempt',
  'gmail_credentials_updated', 'gmail_webhook_received', 'invalid_oauth_state_token',
  'anonymous_profile_access_blocked', 'cross_user_profile_access_blocked',
  'sensitive_table_access', 'rate_limit_exceeded', 'invalid_request_signature',
  'webhook_verification_failed', 'encryption_operation_failed', 'decryption_operation_failed',
  'token_storage_blocked'
));

-- Now enhance profiles table security with stricter RLS policies
-- Drop existing policies to replace them with more secure versions
DROP POLICY IF EXISTS "Authenticated users: profiles SELECT" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users: profiles INSERT" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users: profiles UPDATE" ON public.profiles;
DROP POLICY IF EXISTS "DENY all anonymous access to profiles" ON public.profiles;

-- Create ultra-strict RLS policies for profiles table
-- 1. Absolute denial of anonymous access
CREATE POLICY "ABSOLUTE_DENY_anonymous_access_to_profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- 2. Users can only view their own profile
CREATE POLICY "ZERO_TRUST_profiles_select" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- 3. Users can only insert their own profile
CREATE POLICY "ZERO_TRUST_profiles_insert" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- 4. Users can only update their own profile
CREATE POLICY "ZERO_TRUST_profiles_update" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- 5. Create security function to validate profile access
CREATE OR REPLACE FUNCTION public.can_access_profile_ultra_strict(profile_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    auth.uid() IS NOT NULL 
    AND auth.uid() = profile_user_id;
$$;