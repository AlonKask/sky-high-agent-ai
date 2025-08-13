-- SECURITY HARDENING: Final cleanup and fix existing policies

-- 1. Clean up invalid security events and fix constraint  
DO $$
DECLARE
    invalid_events text[];
BEGIN
    -- Update any invalid event types to 'suspicious_activity'
    UPDATE public.security_events 
    SET event_type = 'suspicious_activity'
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
    );
    
    -- Drop existing constraint if it exists
    ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;
    
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

-- 2. Create missing tables with IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid,
  request_id uuid,
  quote_reference text,
  total_price numeric,
  markup_amount numeric,
  commission_rate numeric,
  passenger_breakdown jsonb DEFAULT '{}',
  pricing_details jsonb DEFAULT '{}',
  status text DEFAULT 'draft',
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid,
  quote_id uuid,
  booking_reference text,
  pnr text,
  ticket_numbers jsonb DEFAULT '[]',
  passenger_details jsonb DEFAULT '[]',
  payment_status text DEFAULT 'pending',
  total_amount numeric,
  booking_status text DEFAULT 'confirmed',
  travel_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Enable RLS and create DENY ALL policies for new tables
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all policies for quotes
DROP POLICY IF EXISTS "DENY all anonymous access to quotes" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes SELECT - strict access control" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes INSERT - owner only" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes UPDATE - owner and authorized only" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes DELETE - owner only" ON public.quotes;

CREATE POLICY "DENY all anonymous access to quotes"
ON public.quotes FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "Enhanced quotes SELECT - strict access control"
ON public.quotes FOR SELECT TO authenticated
USING (can_access_client_data_enhanced(user_id, client_id));

CREATE POLICY "Enhanced quotes INSERT - owner only"
ON public.quotes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enhanced quotes UPDATE - owner and authorized only"
ON public.quotes FOR UPDATE TO authenticated
USING (can_access_client_data_enhanced(user_id, client_id))
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enhanced quotes DELETE - owner only"
ON public.quotes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Drop and recreate all policies for bookings
DROP POLICY IF EXISTS "DENY all anonymous access to bookings" ON public.bookings;
DROP POLICY IF EXISTS "Enhanced bookings SELECT - strict access control" ON public.bookings;
DROP POLICY IF EXISTS "Enhanced bookings INSERT - owner only" ON public.bookings;
DROP POLICY IF EXISTS "Enhanced bookings UPDATE - owner and authorized only" ON public.bookings;
DROP POLICY IF EXISTS "Enhanced bookings DELETE - owner only" ON public.bookings;

CREATE POLICY "DENY all anonymous access to bookings"
ON public.bookings FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "Enhanced bookings SELECT - strict access control"
ON public.bookings FOR SELECT TO authenticated
USING (can_access_client_data_enhanced(user_id, client_id));

CREATE POLICY "Enhanced bookings INSERT - owner only"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enhanced bookings UPDATE - owner and authorized only"
ON public.bookings FOR UPDATE TO authenticated
USING (can_access_client_data_enhanced(user_id, client_id))
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enhanced bookings DELETE - owner only"
ON public.bookings FOR DELETE TO authenticated
USING (auth.uid() = user_id);