-- FIX REMAINING FUNCTION SEARCH PATH SECURITY WARNINGS - CORRECTED
-- Drop and recreate functions to fix parameter conflicts

-- Drop existing functions that need to be fixed
DROP FUNCTION IF EXISTS public.update_client_encrypted_field(uuid, text, text);
DROP FUNCTION IF EXISTS public.get_client_data_secure(uuid, boolean);
DROP FUNCTION IF EXISTS public.emergency_client_access(uuid, text);

-- 1. Recreate get_client_data_secure function with proper search path
CREATE OR REPLACE FUNCTION public.get_client_data_secure(p_client_id uuid, p_include_sensitive boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_data jsonb;
  user_role app_role;
  client_owner_id uuid;
BEGIN
  -- Get client owner
  SELECT user_id INTO client_owner_id
  FROM clients
  WHERE id = p_client_id;
  
  IF client_owner_id IS NULL THEN
    RAISE EXCEPTION 'Client not found' USING ERRCODE = '02000';
  END IF;
  
  -- Check access permission
  IF NOT can_access_client_data_ultra_strict(client_owner_id, p_client_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  
  -- Get user role for masking decisions
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = auth.uid();
  
  -- Fetch client data
  SELECT to_jsonb(c) INTO client_data
  FROM (
    SELECT id, user_id, first_name, last_name, email, phone, company,
           preferred_class, notes, total_bookings, total_spent, last_trip_date,
           date_of_birth, client_type, created_at, updated_at,
           CASE 
             WHEN p_include_sensitive AND user_role IN ('admin', 'manager') THEN encrypted_ssn
             ELSE NULL
           END as encrypted_ssn,
           CASE 
             WHEN p_include_sensitive AND user_role IN ('admin', 'manager') THEN encrypted_passport_number
             ELSE NULL
           END as encrypted_passport_number,
           CASE 
             WHEN p_include_sensitive AND user_role IN ('admin', 'manager') THEN encrypted_payment_info
             ELSE NULL
           END as encrypted_payment_info
    FROM clients
    WHERE id = p_client_id
  ) c;
  
  -- Apply data masking based on role
  client_data := mask_client_data(client_data, COALESCE(user_role, 'agent'::app_role));
  
  RETURN client_data;
END;
$$;

-- 2. Recreate emergency_client_access function with proper search path
CREATE OR REPLACE FUNCTION public.emergency_client_access(p_client_id uuid, p_justification text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_data jsonb;
  user_role app_role;
BEGIN
  -- Only admins can use emergency access
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required for emergency access' USING ERRCODE = '42501';
  END IF;
  
  -- Log emergency access
  PERFORM log_security_event(
    'emergency_client_access_granted',
    'critical',
    jsonb_build_object(
      'client_id', p_client_id,
      'admin_id', auth.uid(),
      'justification', p_justification,
      'emergency_access', true
    )
  );
  
  -- Get client data without normal access checks
  SELECT to_jsonb(c) INTO client_data
  FROM clients c
  WHERE c.id = p_client_id;
  
  IF client_data IS NULL THEN
    RAISE EXCEPTION 'Client not found' USING ERRCODE = '02000';
  END IF;
  
  RETURN client_data;
END;
$$;

-- 3. Recreate update_client_encrypted_field function with proper search path
CREATE OR REPLACE FUNCTION public.update_client_encrypted_field(
  p_client_id uuid, 
  p_field_name text, 
  p_new_value text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_owner_id uuid;
  user_role app_role;
BEGIN
  -- Validate field name
  IF p_field_name NOT IN ('encrypted_ssn', 'encrypted_passport_number', 'encrypted_payment_info') THEN
    RAISE EXCEPTION 'Invalid field name: %', p_field_name USING ERRCODE = '22000';
  END IF;
  
  -- Get client owner
  SELECT user_id INTO client_owner_id
  FROM clients
  WHERE id = p_client_id;
  
  IF client_owner_id IS NULL THEN
    RAISE EXCEPTION 'Client not found' USING ERRCODE = '02000';
  END IF;
  
  -- Check access permission
  IF NOT can_access_client_data_ultra_strict(client_owner_id, p_client_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  
  -- Get user role
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = auth.uid();
  
  -- Only managers and admins can update encrypted fields
  IF user_role NOT IN ('manager', 'admin') THEN
    RAISE EXCEPTION 'Access denied: Manager or Admin role required' USING ERRCODE = '42501';
  END IF;
  
  -- Update the specific field
  IF p_field_name = 'encrypted_ssn' THEN
    UPDATE clients SET encrypted_ssn = p_new_value WHERE id = p_client_id;
  ELSIF p_field_name = 'encrypted_passport_number' THEN
    UPDATE clients SET encrypted_passport_number = p_new_value WHERE id = p_client_id;
  ELSIF p_field_name = 'encrypted_payment_info' THEN
    UPDATE clients SET encrypted_payment_info = p_new_value::jsonb WHERE id = p_client_id;
  END IF;
  
  -- Log the update
  PERFORM log_security_event(
    'client_encrypted_field_updated',
    'high',
    jsonb_build_object(
      'client_id', p_client_id,
      'field_name', p_field_name,
      'updated_by', auth.uid(),
      'user_role', user_role
    )
  );
  
  RETURN true;
END;
$$;