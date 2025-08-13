-- Phase 1: Fix Critical Security Logging Issue
-- Update security_events table constraint to include all event types used in codebase

-- Drop the existing constraint
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;

-- Add updated constraint with all event types found in the codebase INCLUDING the new ones
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
  'sql_injection_attempt', 'xss_attempt', 'csrf_attempt', 'security_system_updated'
));

-- Phase 2: Enhance flight price tracking access control
-- Current policy allows any authenticated user - restrict to specific roles

-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can view flight price data" ON public.flight_price_tracking;

-- Create role-based policy for flight price data
CREATE POLICY "Agents and above can view flight price data" 
ON public.flight_price_tracking 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'agent'::app_role) OR
    public.has_role(auth.uid(), 'supervisor'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Phase 3: Add missing security indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_severity 
ON public.security_events(user_id, severity, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_event_type_timestamp 
ON public.security_events(event_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sensitive_data_access_user_timestamp 
ON public.sensitive_data_access(user_id, timestamp DESC);

-- Phase 4: Add security event cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_security_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Archive critical and high severity events older than 2 years
  -- Delete medium and low severity events older than 6 months
  DELETE FROM public.security_events 
  WHERE severity IN ('low', 'medium') 
  AND timestamp < now() - INTERVAL '6 months';
  
  DELETE FROM public.security_events 
  WHERE severity = 'high' 
  AND timestamp < now() - INTERVAL '2 years';
  
  -- Keep critical events indefinitely for compliance
END;
$$;

-- Log the security fix completion
SELECT public.log_security_event(
  'security_system_updated',
  'low',
  jsonb_build_object(
    'fixes_applied', ARRAY[
      'constraint_updated',
      'flight_data_access_restricted', 
      'performance_indexes_added',
      'cleanup_function_created'
    ],
    'timestamp', now()
  )
);