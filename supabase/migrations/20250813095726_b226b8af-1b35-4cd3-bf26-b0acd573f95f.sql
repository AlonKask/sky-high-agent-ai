-- Add missing event type and finalize security controls
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;

ALTER TABLE public.security_events ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type IN (
  'login_success', 'login_failure', 'logout', 'password_change',
  'unauthorized_access_attempt', 'suspicious_activity', 'data_breach_attempt',
  'admin_action', 'sensitive_data_access', 'client_sensitive_modified',
  'gmail_credentials_updated', 'invalid_oauth_state_token', 'option_token_access_denied',
  'option_token_accessed', 'option_review_token_generated', 'rate_limit_exceeded',
  'invalid_option_token_attempt', 'unauthorized_sensitive_access',
  'sensitive_data_accessed', 'authorized_sensitive_access',
  'unauthorized_sensitive_access_attempt', 'sensitive_client_data_access',
  'encryption_operation', 'decryption_operation', 'field_encryption_audit',
  'token_storage_blocked', 'security_scan_completed', 'threat_level_elevated',
  'access_pattern_anomaly', 'brute_force_attempt', 'session_hijack_attempt',
  'sql_injection_attempt', 'xss_attempt', 'csrf_attempt', 'security_system_updated',
  'client_access_control_enhanced', 'admin_client_access', 'emergency_client_access',
  'security_access_controls_validated'
));

-- Update the secure client view function to work with new access controls
CREATE OR REPLACE FUNCTION public.get_secure_client_view()
RETURNS TABLE(
  id uuid, user_id uuid, first_name text, last_name text, 
  email_masked text, phone_masked text, company text, preferred_class text, 
  client_type text, total_bookings integer, total_spent numeric, 
  last_trip_date date, date_of_birth date, notes text, data_classification text, 
  created_at timestamp with time zone, updated_at timestamp with time zone, 
  ssn_status text, passport_status text, payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.user_id,
        c.first_name,
        c.last_name,
        public.mask_sensitive_field(c.email, 'email') as email_masked,
        public.mask_sensitive_field(c.phone, 'phone') as phone_masked,
        c.company,
        c.preferred_class,
        c.client_type,
        c.total_bookings,
        c.total_spent,
        c.last_trip_date,
        c.date_of_birth,
        c.notes,
        c.data_classification,
        c.created_at,
        c.updated_at,
        CASE 
            WHEN c.encrypted_ssn IS NOT NULL THEN 'SSN_ON_FILE'
            ELSE NULL 
        END as ssn_status,
        CASE 
            WHEN c.encrypted_passport_number IS NOT NULL THEN 'PASSPORT_ON_FILE'
            ELSE NULL 
        END as passport_status,
        CASE 
            WHEN c.encrypted_payment_info IS NOT NULL THEN 'PAYMENT_INFO_ON_FILE'
            ELSE NULL 
        END as payment_status
    FROM public.clients c
    WHERE public.can_access_client(c.user_id, auth.uid());
END;
$$;