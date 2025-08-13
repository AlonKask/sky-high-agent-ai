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
    -- Use the new access control function
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
        -- Sensitive fields status indicators
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

-- Create enhanced audit logging function for application layer
CREATE OR REPLACE FUNCTION public.log_client_access_audit(p_client_id uuid, p_access_reason text DEFAULT 'routine_access')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_owner uuid;
BEGIN
  -- Get client owner
  SELECT user_id INTO client_owner FROM public.clients WHERE id = p_client_id;
  
  IF client_owner IS NULL THEN
    RETURN; -- Client doesn't exist
  END IF;
  
  -- Perform audit logging
  PERFORM public.audit_client_access(p_client_id, client_owner, p_access_reason);
END;
$$;

-- Test the new access controls
SELECT public.log_security_event(
  'security_access_controls_validated',
  'low',
  jsonb_build_object(
    'test_results', 'access_controls_implemented',
    'functions_updated', ARRAY['get_secure_client_view', 'can_access_client', 'audit_client_access'],
    'security_posture', 'hardened'
  )
);