-- Clean up invalid security events and fix constraint
-- First, let's see what invalid event types we have and clean them up

-- Step 1: Update invalid event types to valid ones or delete them
UPDATE public.security_events 
SET event_type = 'suspicious_activity'
WHERE event_type NOT IN (
  'login_attempt', 'logout', 'password_change', 'permission_denied',
  'sensitive_data_access', 'data_modification', 'suspicious_activity',
  'rate_limit_exceeded', 'session_expired', 'unauthorized_access_attempt',
  'admin_action', 'security_alert', 'data_export', 'encryption_event',
  'policy_violation', 'session_bypass_used', 'clients_access_attempt',
  'sensitive_client_data_accessed', 'client_data_modified', 'unauthorized_client_access',
  'admin_client_data_access', 'manager_team_client_access', 'supervisor_team_client_access',
  'cross_user_client_access', 'sensitive_client_data_modified', 'emergency_client_access_granted',
  'audit_data_accessed', 'gmail_credentials_updated', 'option_token_accessed',
  'option_token_access_denied', 'invalid_option_token_attempt', 'option_review_token_generated'
);

-- Step 2: Now safely add the constraint
ALTER TABLE public.security_events 
DROP CONSTRAINT IF EXISTS security_events_event_type_check;

ALTER TABLE public.security_events 
ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type IN (
  'login_attempt', 'logout', 'password_change', 'permission_denied',
  'sensitive_data_access', 'data_modification', 'suspicious_activity',
  'rate_limit_exceeded', 'session_expired', 'unauthorized_access_attempt',
  'admin_action', 'security_alert', 'data_export', 'encryption_event',
  'policy_violation', 'session_bypass_used', 'clients_access_attempt',
  'sensitive_client_data_accessed', 'client_data_modified', 'unauthorized_client_access',
  'admin_client_data_access', 'manager_team_client_access', 'supervisor_team_client_access',
  'cross_user_client_access', 'sensitive_client_data_modified', 'emergency_client_access_granted',
  'audit_data_accessed', 'gmail_credentials_updated', 'option_token_accessed',
  'option_token_access_denied', 'invalid_option_token_attempt', 'option_review_token_generated'
));