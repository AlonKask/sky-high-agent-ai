-- FIX SECURITY LINTER WARNINGS: Set proper search paths for functions

-- Fix 1: Update get_client_sensitive_data function with proper search path
CREATE OR REPLACE FUNCTION get_client_sensitive_data(p_client_id uuid)
RETURNS TABLE(
    id uuid,
    encrypted_ssn text,
    encrypted_passport_number text,
    encrypted_payment_info jsonb
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    client_owner uuid;
    user_role_check boolean;
BEGIN
    -- Get client owner
    SELECT user_id INTO client_owner 
    FROM public.clients 
    WHERE public.clients.id = p_client_id;
    
    -- Check if user has permission (owner or elevated role)
    user_role_check := (
        auth.uid() = client_owner OR
        public.has_role(auth.uid(), 'supervisor'::public.app_role) OR
        public.has_role(auth.uid(), 'manager'::public.app_role) OR
        public.has_role(auth.uid(), 'admin'::public.app_role)
    );
    
    IF NOT user_role_check THEN
        -- Log unauthorized attempt
        INSERT INTO public.security_events (
            user_id, event_type, severity, details
        ) VALUES (
            auth.uid(),
            'unauthorized_sensitive_access_attempt',
            'high',
            jsonb_build_object(
                'client_id', p_client_id,
                'attempted_by', auth.uid(),
                'client_owner', client_owner
            )
        );
        
        RAISE EXCEPTION 'Unauthorized access to sensitive client data';
    END IF;
    
    -- Log authorized access
    INSERT INTO public.security_events (
        user_id, event_type, severity, details
    ) VALUES (
        auth.uid(),
        'authorized_sensitive_access',
        'low',
        jsonb_build_object(
            'client_id', p_client_id,
            'accessed_by', auth.uid(),
            'access_reason', 'legitimate_business_need'
        )
    );
    
    -- Return sensitive data
    RETURN QUERY
    SELECT c.id, c.encrypted_ssn, c.encrypted_passport_number, c.encrypted_payment_info
    FROM public.clients c
    WHERE c.id = p_client_id;
END;
$$;

-- Fix 2: Update audit_sensitive_client_access function with proper search path
CREATE OR REPLACE FUNCTION audit_sensitive_client_access()
RETURNS TRIGGER
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Log any access to clients with sensitive data
    IF NEW.encrypted_ssn IS NOT NULL OR 
       NEW.encrypted_passport_number IS NOT NULL OR 
       NEW.encrypted_payment_info IS NOT NULL THEN
        
        INSERT INTO public.security_events (
            user_id, 
            event_type, 
            severity, 
            details
        ) VALUES (
            auth.uid(),
            'sensitive_client_data_access',
            'medium',
            jsonb_build_object(
                'client_id', NEW.id,
                'action', TG_OP,
                'has_ssn', (NEW.encrypted_ssn IS NOT NULL),
                'has_passport', (NEW.encrypted_passport_number IS NOT NULL),
                'has_payment_info', (NEW.encrypted_payment_info IS NOT NULL)
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix 3: Update mask_sensitive_field function with proper search path
CREATE OR REPLACE FUNCTION mask_sensitive_field(field_value text, field_type text DEFAULT 'general')
RETURNS text 
LANGUAGE plpgsql 
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
    IF field_value IS NULL OR field_value = '' THEN
        RETURN NULL;
    END IF;
    
    CASE field_type
        WHEN 'ssn' THEN
            RETURN 'XXX-XX-' || RIGHT(field_value, 4);
        WHEN 'passport' THEN
            RETURN LEFT(field_value, 2) || 'XXXXXX' || RIGHT(field_value, 2);
        WHEN 'email' THEN
            RETURN LEFT(split_part(field_value, '@', 1), 2) || '***@' || split_part(field_value, '@', 2);
        WHEN 'phone' THEN
            RETURN 'XXX-XXX-' || RIGHT(regexp_replace(field_value, '[^0-9]', '', 'g'), 4);
        ELSE
            RETURN LEFT(field_value, 2) || REPEAT('*', GREATEST(LENGTH(field_value) - 4, 0)) || RIGHT(field_value, 2);
    END CASE;
END;
$$;

-- Fix 4: Update validate_encrypted_client_data function with proper search path
CREATE OR REPLACE FUNCTION validate_encrypted_client_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Ensure encrypted fields follow proper format if provided
    IF NEW.encrypted_ssn IS NOT NULL THEN
        -- Basic validation for base64 format (encrypted data should be base64)
        IF NEW.encrypted_ssn !~ '^[A-Za-z0-9+/]*={0,2}$' OR LENGTH(NEW.encrypted_ssn) < 16 THEN
            RAISE EXCEPTION 'Invalid encrypted SSN format';
        END IF;
    END IF;
    
    IF NEW.encrypted_passport_number IS NOT NULL THEN
        IF NEW.encrypted_passport_number !~ '^[A-Za-z0-9+/]*={0,2}$' OR LENGTH(NEW.encrypted_passport_number) < 16 THEN
            RAISE EXCEPTION 'Invalid encrypted passport format';
        END IF;
    END IF;
    
    -- Validate data classification
    IF NEW.data_classification NOT IN ('public', 'internal', 'confidential', 'restricted') THEN
        NEW.data_classification = 'confidential';
    END IF;
    
    -- Auto-upgrade classification for sensitive data
    IF (NEW.encrypted_ssn IS NOT NULL OR 
        NEW.encrypted_passport_number IS NOT NULL OR 
        NEW.encrypted_payment_info IS NOT NULL) AND 
       NEW.data_classification NOT IN ('confidential', 'restricted') THEN
        NEW.data_classification = 'restricted';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix 5: Drop and recreate the secure view as a standard view (not security definer)
DROP VIEW IF EXISTS secure_client_view;

-- Create a secure function instead of a security definer view
CREATE OR REPLACE FUNCTION get_secure_client_view()
RETURNS TABLE(
    id uuid,
    user_id uuid,
    first_name text,
    last_name text,
    email_masked text,
    phone_masked text,
    company text,
    preferred_class text,
    client_type text,
    total_bookings integer,
    total_spent numeric,
    last_trip_date date,
    date_of_birth date,
    notes text,
    data_classification text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    ssn_status text,
    passport_status text,
    payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
        -- Sensitive fields are excluded from this view
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
    WHERE 
        -- Apply same RLS as main table
        (auth.uid() = c.user_id) OR 
        public.has_role(auth.uid(), 'supervisor'::public.app_role) OR
        public.has_role(auth.uid(), 'manager'::public.app_role) OR
        public.has_role(auth.uid(), 'admin'::public.app_role);
END;
$$;