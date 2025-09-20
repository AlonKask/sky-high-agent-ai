-- Remove CAPTCHA-related database components

-- Remove CAPTCHA verification tables and functions
DROP TABLE IF EXISTS captcha_verifications CASCADE;

-- Remove CAPTCHA-related functions  
DROP FUNCTION IF EXISTS log_captcha_verification(uuid, text, text, text) CASCADE;

-- Update security event types to remove CAPTCHA references
DELETE FROM security_events WHERE event_type LIKE '%captcha%';

-- Remove any CAPTCHA-related audit entries
DELETE FROM audit_logs WHERE table_name = 'captcha_verifications';

-- Clean up any CAPTCHA-related access rate limits
DELETE FROM access_rate_limits WHERE endpoint LIKE '%captcha%';