-- ENHANCED SECURITY: Additional protection for sensitive client data
-- This implements defense-in-depth security for the clients table

-- 1. Create audit logging for all sensitive data access
CREATE OR REPLACE FUNCTION audit_sensitive_client_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log any access to clients with sensitive data
    IF NEW.encrypted_ssn IS NOT NULL OR 
       NEW.encrypted_passport_number IS NOT NULL OR 
       NEW.encrypted_payment_info IS NOT NULL THEN
        
        INSERT INTO security_events (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger
DROP TRIGGER IF EXISTS audit_sensitive_client_access_trigger ON clients;
CREATE TRIGGER audit_sensitive_client_access_trigger
    AFTER INSERT OR UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION audit_sensitive_client_access();

-- 2. Create function to safely access sensitive client data with enhanced logging
CREATE OR REPLACE FUNCTION get_client_sensitive_data(p_client_id uuid)
RETURNS TABLE(
    id uuid,
    encrypted_ssn text,
    encrypted_passport_number text,
    encrypted_payment_info jsonb
) AS $$
DECLARE
    client_owner uuid;
    user_role_check boolean;
BEGIN
    -- Get client owner
    SELECT user_id INTO client_owner 
    FROM clients 
    WHERE clients.id = p_client_id;
    
    -- Check if user has permission (owner or elevated role)
    user_role_check := (
        auth.uid() = client_owner OR
        has_role(auth.uid(), 'supervisor'::app_role) OR
        has_role(auth.uid(), 'manager'::app_role) OR
        has_role(auth.uid(), 'admin'::app_role)
    );
    
    IF NOT user_role_check THEN
        -- Log unauthorized attempt
        INSERT INTO security_events (
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
    INSERT INTO security_events (
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
    FROM clients c
    WHERE c.id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create data masking function for displaying sensitive fields
CREATE OR REPLACE FUNCTION mask_sensitive_field(field_value text, field_type text DEFAULT 'general')
RETURNS text AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Create secure view for client data with automatic masking
CREATE OR REPLACE VIEW secure_client_view AS
SELECT 
    id,
    user_id,
    first_name,
    last_name,
    mask_sensitive_field(email, 'email') as email_masked,
    mask_sensitive_field(phone, 'phone') as phone_masked,
    company,
    preferred_class,
    client_type,
    total_bookings,
    total_spent,
    last_trip_date,
    date_of_birth,
    notes,
    data_classification,
    created_at,
    updated_at,
    -- Sensitive fields are excluded from this view
    CASE 
        WHEN encrypted_ssn IS NOT NULL THEN 'SSN_ON_FILE'
        ELSE NULL 
    END as ssn_status,
    CASE 
        WHEN encrypted_passport_number IS NOT NULL THEN 'PASSPORT_ON_FILE'
        ELSE NULL 
    END as passport_status,
    CASE 
        WHEN encrypted_payment_info IS NOT NULL THEN 'PAYMENT_INFO_ON_FILE'
        ELSE NULL 
    END as payment_status
FROM clients
WHERE 
    -- Apply same RLS as main table
    (auth.uid() = user_id) OR 
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role);

-- 5. Enhanced validation for encrypted fields
CREATE OR REPLACE FUNCTION validate_encrypted_client_data()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Apply validation trigger
DROP TRIGGER IF EXISTS validate_encrypted_client_data_trigger ON clients;
CREATE TRIGGER validate_encrypted_client_data_trigger
    BEFORE INSERT OR UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION validate_encrypted_client_data();