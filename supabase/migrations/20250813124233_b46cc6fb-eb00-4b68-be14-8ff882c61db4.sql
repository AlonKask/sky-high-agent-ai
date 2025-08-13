-- SECURITY HARDENING: Fix security events constraint and create missing audit infrastructure

-- 1. First clean up invalid security event types and fix the constraint
DO $$
DECLARE
    invalid_events text[];
BEGIN
    -- Get list of current invalid event types
    SELECT ARRAY(
        SELECT DISTINCT event_type 
        FROM public.security_events 
        WHERE event_type NOT IN (
            'login_success', 'login_failure', 'logout', 'password_change',
            'unauthorized_access_attempt', 'suspicious_activity', 'rate_limit_exceeded',
            'sensitive_data_access', 'sensitive_data_modified', 'sensitive_table_access',
            'admin_action', 'admin_client_data_access', 'admin_session_access',
            'manager_team_client_access', 'supervisor_team_client_access',
            'unauthorized_client_access_attempt', 'unauthorized_gmail_access_attempt',
            'unauthorized_session_access_attempt', 'cross_user_client_access',
            'client_sensitive_modified', 'emergency_client_access_granted',
            'gmail_credentials_updated', 'option_review_token_generated',
            'option_token_accessed', 'option_token_access_denied',
            'invalid_option_token_attempt', 'audit_data_accessed',
            'encryption_operation', 'decryption_operation', 'data_export_requested',
            'gdpr_consent_given', 'gdpr_consent_withdrawn', 'security_scan_performed',
            'policy_violation', 'access_denied', 'privilege_escalation_attempt'
        )
    ) INTO invalid_events;
    
    -- Update invalid event types to 'suspicious_activity'
    UPDATE public.security_events 
    SET event_type = 'suspicious_activity'
    WHERE event_type = ANY(invalid_events);
    
    -- Drop existing constraint if it exists
    BEGIN
        ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;
    EXCEPTION WHEN OTHERS THEN
        -- Constraint doesn't exist, continue
        NULL;
    END;
    
    -- Create new comprehensive constraint
    ALTER TABLE public.security_events ADD CONSTRAINT security_events_event_type_check 
    CHECK (event_type IN (
        'login_success', 'login_failure', 'logout', 'password_change',
        'unauthorized_access_attempt', 'suspicious_activity', 'rate_limit_exceeded',
        'sensitive_data_access', 'sensitive_data_modified', 'sensitive_table_access',
        'admin_action', 'admin_client_data_access', 'admin_session_access',
        'manager_team_client_access', 'supervisor_team_client_access',
        'unauthorized_client_access_attempt', 'unauthorized_gmail_access_attempt',
        'unauthorized_session_access_attempt', 'cross_user_client_access',
        'client_sensitive_modified', 'emergency_client_access_granted',
        'gmail_credentials_updated', 'option_review_token_generated',
        'option_token_accessed', 'option_token_access_denied',
        'invalid_option_token_attempt', 'audit_data_accessed',
        'encryption_operation', 'decryption_operation', 'data_export_requested',
        'gdpr_consent_given', 'gdpr_consent_withdrawn', 'security_scan_performed',
        'policy_violation', 'access_denied', 'privilege_escalation_attempt'
    ));
END $$;

-- 2. Create missing audit and security infrastructure tables
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  timestamp timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sensitive_data_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accessed_user_id uuid,
  data_type text NOT NULL,
  access_reason text,
  timestamp timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text
);

CREATE TABLE IF NOT EXISTS public.access_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

CREATE TABLE IF NOT EXISTS public.oauth_state_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  state_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone DEFAULT (now() + INTERVAL '10 minutes'),
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit tables
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensitive_data_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_state_tokens ENABLE ROW LEVEL SECURITY;

-- Create audit table policies
CREATE POLICY "Admin only audit logs access" ON public.audit_logs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin only sensitive access logs" ON public.sensitive_data_access  
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (true);

CREATE POLICY "Admin only rate limits access" ON public.access_rate_limits
FOR ALL TO authenticated  
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (true);

CREATE POLICY "Users manage own oauth tokens" ON public.oauth_state_tokens
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);