-- Remove CAPTCHA database artifacts
DROP TABLE IF EXISTS public.captcha_verifications CASCADE;

-- Remove CAPTCHA function if it exists
DROP FUNCTION IF EXISTS public.log_captcha_verification(text, boolean, text, inet, text) CASCADE;

-- Clean up any CAPTCHA-related security event types from constraints
-- Note: We'll keep the security_events table but remove CAPTCHA-specific constraint if it exists
DO $$
BEGIN
    -- Remove check constraint that might reference captcha event types
    ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;
    
    -- Recreate the constraint without captcha-related event types
    ALTER TABLE public.security_events ADD CONSTRAINT security_events_event_type_check 
    CHECK (event_type IN (
        'login_attempt', 'failed_login', 'password_change', 'email_change',
        'profile_update', 'data_access', 'suspicious_activity',
        'unauthorized_access_attempt', 'rate_limit_exceeded',
        'token_storage_blocked', 'sensitive_table_access',
        'gmail_credentials_updated', 'option_review_token_generated',
        'option_token_accessed', 'option_token_access_denied',
        'invalid_option_token_attempt', 'session_bypass_used',
        'admin_client_data_access', 'manager_team_client_access',
        'supervisor_team_client_access', 'unauthorized_client_access_attempt',
        'cross_user_client_access', 'sensitive_client_data_modified',
        'emergency_client_access_granted', 'audit_data_accessed',
        'sensitive_data_accessed', 'unauthorized_sensitive_access',
        'admin_action', 'security_scan_completed', 'threat_level_elevated'
    ));
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore if constraint doesn't exist
END $$;