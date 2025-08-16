-- First, clean up any invalid security events that violate the constraint
DELETE FROM public.security_events 
WHERE event_type NOT IN (
  'login_success', 'login_failure', 'logout', 'password_change', 'password_reset',
  'unauthorized_access_attempt', 'sensitive_data_access', 'admin_action', 
  'security_scan_completed', 'threat_level_elevated', 'suspicious_activity',
  'data_breach_detected', 'failed_authentication', 'account_locked',
  'privilege_escalation', 'data_export_request', 'gdpr_request'
);

-- Drop the existing constraint
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;

-- Add comprehensive check constraint for all possible security event types
ALTER TABLE public.security_events ADD CONSTRAINT security_events_event_type_check 
  CHECK (event_type IN (
    'login_success', 'login_failure', 'logout', 'password_change', 'password_reset',
    'unauthorized_access_attempt', 'sensitive_data_access', 'admin_action', 
    'security_scan_completed', 'threat_level_elevated', 'suspicious_activity',
    'data_breach_detected', 'failed_authentication', 'account_locked',
    'privilege_escalation', 'data_export_request', 'gdpr_request',
    'client_sensitive_modified', 'cross_user_client_access', 'admin_client_data_access',
    'manager_team_client_access', 'supervisor_team_client_access',
    'unauthorized_client_access_attempt', 'emergency_client_access_granted',
    'sensitive_client_data_modified', 'gmail_credentials_updated',
    'token_storage_blocked', 'invalid_oauth_state_token', 'option_token_access_denied',
    'option_token_accessed', 'option_review_token_generated', 'invalid_option_token_attempt',
    'rate_limit_exceeded', 'session_bypass_used', 'audit_data_accessed',
    'encryption_audit_log', 'unauthorized_sensitive_access', 'sensitive_table_access',
    'security_event_logged', 'captcha_verification_failed', 'captcha_verification_success',
    'captcha_health_check', 'suspicious_activity_pattern', 'unauthorized_client_data_access',
    'authorized_client_data_access', 'emergency_client_access_used'
  ));