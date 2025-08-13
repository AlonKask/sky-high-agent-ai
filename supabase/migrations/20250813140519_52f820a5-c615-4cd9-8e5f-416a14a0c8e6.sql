-- Fix security events constraint to allow new event types
-- The constraint is blocking legitimate security logging

-- Drop the existing constraint
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;

-- Create updated constraint with all the new event types we're using
ALTER TABLE public.security_events ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type = ANY (ARRAY[
  -- Original allowed types
  'login_success'::text, 'login_failure'::text, 'logout'::text, 'password_change'::text, 
  'unauthorized_access_attempt'::text, 'suspicious_activity'::text, 'rate_limit_exceeded'::text, 
  'sensitive_data_access'::text, 'sensitive_data_modified'::text, 'sensitive_table_access'::text, 
  'admin_action'::text, 'admin_client_data_access'::text, 'admin_session_access'::text, 
  'manager_team_client_access'::text, 'supervisor_team_client_access'::text, 
  'unauthorized_client_access_attempt'::text, 'unauthorized_gmail_access_attempt'::text, 
  'unauthorized_session_access_attempt'::text, 'cross_user_client_access'::text, 
  'client_sensitive_modified'::text, 'emergency_client_access_granted'::text, 
  'gmail_credentials_updated'::text, 'option_review_token_generated'::text, 
  'option_token_accessed'::text, 'option_token_access_denied'::text, 
  'invalid_option_token_attempt'::text, 'audit_data_accessed'::text, 
  'encryption_operation'::text, 'decryption_operation'::text, 'data_export_requested'::text, 
  'gdpr_consent_given'::text, 'gdpr_consent_withdrawn'::text, 'security_scan_performed'::text, 
  'policy_violation'::text, 'access_denied'::text, 'privilege_escalation_attempt'::text,
  
  -- NEW event types needed for zero-trust security
  'manager_client_access'::text, 'supervisor_client_access'::text, 'admin_client_override'::text,
  'client_access_violation'::text, 'client_data_accessed'::text, 'client_data_modified'::text,
  'cross_user_client_modification'::text, 'CRITICAL_BREACH_ATTEMPT'::text,
  'session_security_check'::text, 'authentication_security_check'::text,
  'security_configuration_loaded'::text, 'device_fingerprint_check'::text,
  'rate_limiting_check'::text, 'password_security_check'::text
]));

-- Verify security events table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'security_events' 
ORDER BY ordinal_position;