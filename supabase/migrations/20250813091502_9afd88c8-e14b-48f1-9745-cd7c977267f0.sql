-- ENHANCED FIELD-LEVEL ENCRYPTION: Additional security for most sensitive data
-- This implements client-side field encryption before database storage

-- Create enhanced encryption audit table
CREATE TABLE IF NOT EXISTS public.encryption_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    client_id uuid,
    field_type text NOT NULL,
    action text NOT NULL CHECK (action IN ('encrypt', 'decrypt', 'access')),
    ip_address inet,
    user_agent text,
    timestamp timestamp with time zone DEFAULT now(),
    success boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on encryption audit log
ALTER TABLE public.encryption_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view encryption audit logs
CREATE POLICY "Only admins can view encryption audit logs"
ON public.encryption_audit_log
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert encryption audit logs
CREATE POLICY "System can insert encryption audit logs"
ON public.encryption_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create function to validate field-level encryption format
CREATE OR REPLACE FUNCTION validate_field_encryption(encrypted_data text, field_name text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
    -- Enhanced validation for field-level encrypted data
    IF encrypted_data IS NULL OR encrypted_data = '' THEN
        RETURN true; -- Allow null/empty values
    END IF;
    
    -- Check for proper base64 format (AES-GCM with IV)
    IF encrypted_data !~ '^[A-Za-z0-9+/]*={0,2}$' THEN
        RAISE EXCEPTION 'Invalid encryption format for field %: not base64', field_name;
    END IF;
    
    -- Minimum length check (IV + encrypted data should be at least 28 chars base64)
    IF LENGTH(encrypted_data) < 28 THEN
        RAISE EXCEPTION 'Invalid encryption format for field %: too short', field_name;
    END IF;
    
    -- Maximum reasonable length check to prevent abuse
    IF LENGTH(encrypted_data) > 2048 THEN
        RAISE EXCEPTION 'Invalid encryption format for field %: too long', field_name;
    END IF;
    
    RETURN true;
END;
$$;

-- Update client validation to use enhanced encryption validation
CREATE OR REPLACE FUNCTION validate_encrypted_client_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Enhanced validation for encrypted fields
    IF NEW.encrypted_ssn IS NOT NULL THEN
        PERFORM public.validate_field_encryption(NEW.encrypted_ssn, 'encrypted_ssn');
    END IF;
    
    IF NEW.encrypted_passport_number IS NOT NULL THEN
        PERFORM public.validate_field_encryption(NEW.encrypted_passport_number, 'encrypted_passport_number');
    END IF;
    
    -- Enhanced validation for payment info (JSON or direct encryption)
    IF NEW.encrypted_payment_info IS NOT NULL THEN
        IF jsonb_typeof(NEW.encrypted_payment_info) = 'string' THEN
            PERFORM public.validate_field_encryption(
                trim(both '"' from NEW.encrypted_payment_info::text), 
                'encrypted_payment_info'
            );
        ELSIF jsonb_typeof(NEW.encrypted_payment_info) = 'object' THEN
            IF NEW.encrypted_payment_info ? 'encrypted_data' THEN
                PERFORM public.validate_field_encryption(
                    NEW.encrypted_payment_info->>'encrypted_data', 
                    'encrypted_payment_info.encrypted_data'
                );
            END IF;
        END IF;
    END IF;
    
    -- Auto-classify sensitive data
    IF (NEW.encrypted_ssn IS NOT NULL OR 
        NEW.encrypted_passport_number IS NOT NULL OR 
        NEW.encrypted_payment_info IS NOT NULL) THEN
        NEW.data_classification = 'restricted';
    ELSIF NEW.data_classification IS NULL THEN
        NEW.data_classification = 'confidential';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create secure function for accessing decrypted client data (admin only)
CREATE OR REPLACE FUNCTION get_client_decrypted_preview(p_client_id uuid)
RETURNS TABLE(
    client_id uuid,
    has_encrypted_ssn boolean,
    has_encrypted_passport boolean, 
    has_encrypted_payment boolean,
    data_classification text,
    last_sensitive_update timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only allow admins to see decryption status
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Log admin access
    INSERT INTO public.encryption_audit_log (
        user_id, client_id, field_type, action, metadata
    ) VALUES (
        auth.uid(), p_client_id, 'admin_preview', 'access',
        jsonb_build_object('admin_id', auth.uid(), 'timestamp', now())
    );
    
    RETURN QUERY
    SELECT 
        c.id,
        (c.encrypted_ssn IS NOT NULL) as has_encrypted_ssn,
        (c.encrypted_passport_number IS NOT NULL) as has_encrypted_passport,
        (c.encrypted_payment_info IS NOT NULL) as has_encrypted_payment,
        c.data_classification,
        c.updated_at
    FROM public.clients c
    WHERE c.id = p_client_id;
END;
$$;

-- Create function to safely update encrypted fields
CREATE OR REPLACE FUNCTION update_client_encrypted_field(
    p_client_id uuid,
    p_field_name text,
    p_encrypted_value text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    client_owner uuid;
    is_authorized boolean;
BEGIN
    -- Get client owner
    SELECT user_id INTO client_owner FROM public.clients WHERE id = p_client_id;
    
    IF client_owner IS NULL THEN
        RAISE EXCEPTION 'Client not found';
    END IF;
    
    -- Check authorization
    is_authorized := (
        auth.uid() = client_owner OR
        public.has_role(auth.uid(), 'supervisor'::public.app_role) OR
        public.has_role(auth.uid(), 'manager'::public.app_role) OR
        public.has_role(auth.uid(), 'admin'::public.app_role)
    );
    
    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Unauthorized access to client data';
    END IF;
    
    -- Validate field name
    IF p_field_name NOT IN ('encrypted_ssn', 'encrypted_passport_number', 'encrypted_payment_info') THEN
        RAISE EXCEPTION 'Invalid field name';
    END IF;
    
    -- Validate encryption format
    PERFORM public.validate_field_encryption(p_encrypted_value, p_field_name);
    
    -- Log the update
    INSERT INTO public.encryption_audit_log (
        user_id, client_id, field_type, action, metadata
    ) VALUES (
        auth.uid(), p_client_id, p_field_name, 'encrypt',
        jsonb_build_object('field_updated', p_field_name)
    );
    
    -- Update the field based on field name
    IF p_field_name = 'encrypted_ssn' THEN
        UPDATE public.clients 
        SET encrypted_ssn = p_encrypted_value, updated_at = now()
        WHERE id = p_client_id;
    ELSIF p_field_name = 'encrypted_passport_number' THEN
        UPDATE public.clients 
        SET encrypted_passport_number = p_encrypted_value, updated_at = now()
        WHERE id = p_client_id;
    ELSIF p_field_name = 'encrypted_payment_info' THEN
        UPDATE public.clients 
        SET encrypted_payment_info = jsonb_build_object('encrypted_data', p_encrypted_value), 
            updated_at = now()
        WHERE id = p_client_id;
    END IF;
    
    RETURN true;
END;
$$;