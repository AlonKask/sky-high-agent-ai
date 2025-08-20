-- Security Enhancement Migration: Fix event type constraint and improve security

-- First, let's see what constraint exists and drop it
DO $$ 
DECLARE
    constraint_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'security_events_event_type_check' 
        AND table_name = 'security_events'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        ALTER TABLE public.security_events DROP CONSTRAINT security_events_event_type_check;
    END IF;
END $$;

-- Create comprehensive event type constraint with all the event types used in the codebase
ALTER TABLE public.security_events 
ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type IN (
    -- Authentication events
    'login_success',
    'login_failure', 
    'forced_logout',
    'session_validation_failed',
    'unauthorized_access_attempt',
    'session_expired',
    'device_fingerprint_mismatch',
    'session_hijacking_detected',
    'security_config_updated',
    'mfa_setup_initiated',
    'manual_security_verification',
    
    -- Input validation events  
    'suspicious_email_attempt',
    'suspicious_email_input',
    'form_validation_failure',
    'sql_injection_attempt',
    'xss_attempt',
    'potential_xss_attempt',
    'malicious_input_blocked',
    'suspicious_input_detected',
    
    -- Rate limiting and abuse
    'rate_limit_exceeded',
    'repeated_unauthorized_attempts',
    'suspicious_activity_pattern',
    'forced_security_logout',
    'forced_logout_anomaly',
    
    -- Data access and privacy
    'sensitive_data_accessed',
    'data_encrypted',
    'data_decrypted',
    'encryption_failed', 
    'decryption_failed',
    'data_validation_failed',
    'unauthorized_sensitive_access',
    'sensitive_data_access',
    'client_data_accessed',
    'cross_user_client_access',
    'admin_client_data_access',
    'manager_team_client_access',
    'supervisor_team_client_access',
    'unauthorized_client_access_attempt',
    'sensitive_client_data_modified',
    'admin_override_access',
    
    -- System security
    'missing_security_headers',
    'security_headers_validated',
    'threat_hunt_initiated',
    'compliance_report_generated',
    'compliance_report_downloaded',
    'audit_data_accessed',
    'critical_security_incident',
    'lockdown_initiated',
    'monitoring_error',
    'validation_error',
    'access_control_error',
    'unknown_table_access',
    
    -- OAuth and tokens
    'gmail_credentials_updated',
    'option_review_token_generated',
    'option_token_accessed',
    'option_token_access_denied', 
    'invalid_option_token_attempt',
    'invalid_oauth_state_token',
    'token_storage_blocked',
    
    -- Client and communication
    'client_data_select',
    'client_data_insert', 
    'client_data_update',
    'client_data_delete',
    'sensitive_table_access',
    'unauthenticated_access_attempt',
    
    -- Generic events
    'security_event_logged',
    'security_scan_completed',
    'anomaly_detected'
));

-- Add index for better performance on event_type queries
CREATE INDEX IF NOT EXISTS idx_security_events_event_type 
ON public.security_events(event_type);

-- Add index for timestamp-based queries  
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp 
ON public.security_events(timestamp DESC);

-- Add index for user-based queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_severity 
ON public.security_events(user_id, severity, timestamp DESC);

-- Create function to validate and log security events with fallback
CREATE OR REPLACE FUNCTION public.safe_log_security_event(
    p_event_type text,
    p_severity text DEFAULT 'medium',
    p_details jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    event_allowed boolean;
BEGIN
    -- Check if event type is allowed
    SELECT EXISTS (
        SELECT 1 FROM information_schema.check_constraints cc
        JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'security_events' 
        AND cc.check_clause LIKE '%' || p_event_type || '%'
    ) INTO event_allowed;
    
    -- If event type not explicitly allowed, use generic type
    IF NOT event_allowed THEN
        p_event_type := 'security_event_logged';
        p_details := p_details || jsonb_build_object('original_event_type', p_event_type);
    END IF;
    
    -- Insert the security event
    INSERT INTO public.security_events (
        user_id,
        event_type, 
        severity,
        details,
        user_agent,
        ip_address
    ) VALUES (
        auth.uid(),
        p_event_type,
        p_severity,
        p_details || jsonb_build_object(
            'timestamp', now(),
            'session_id', COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'session_id', 'unknown')
        ),
        current_setting('request.headers', true)::json->>'user-agent',
        inet_client_addr()
    );
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- If all else fails, at least log to server logs
    RAISE NOTICE 'Security event logging failed: % (%) - %', p_event_type, p_severity, SQLERRM;
    RETURN false;
END;
$$;