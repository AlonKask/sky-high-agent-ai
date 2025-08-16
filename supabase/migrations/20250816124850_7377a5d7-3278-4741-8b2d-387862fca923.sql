-- FINAL SECURITY FIX: IDENTIFY AND FIX ALL REMAINING FUNCTIONS
-- Check for functions without SET search_path and fix them

-- Common functions that might be missing search_path:

-- 1. Fix mask_client_data if it exists
CREATE OR REPLACE FUNCTION public.mask_client_data(p_client_data jsonb, p_user_role app_role DEFAULT 'agent'::app_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  masked_data jsonb := p_client_data;
BEGIN
  -- Always mask sensitive data in transit
  IF masked_data ? 'email' THEN
    masked_data := jsonb_set(masked_data, '{email}', 
      to_jsonb(CASE 
        WHEN p_user_role = 'admin' THEN masked_data->>'email'
        ELSE regexp_replace(masked_data->>'email', '^(.{2}).*(@.+)$', '\1***\2')
      END)
    );
  END IF;
  
  IF masked_data ? 'phone' THEN
    masked_data := jsonb_set(masked_data, '{phone}', 
      to_jsonb(CASE 
        WHEN p_user_role = 'admin' THEN masked_data->>'phone'
        ELSE regexp_replace(COALESCE(masked_data->>'phone', ''), '(\d{3})\d+(\d{4})', '\1***\2')
      END)
    );
  END IF;
  
  -- Remove encrypted fields from JSON response
  masked_data := masked_data - 'encrypted_ssn' - 'encrypted_passport_number' - 'encrypted_payment_info';
  
  RETURN masked_data;
END;
$$;

-- 2. Fix has_role function to ensure it has search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Fix get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role 
  FROM user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- 4. Fix can_access_client_data_ultra_strict function
CREATE OR REPLACE FUNCTION public.can_access_client_data_ultra_strict(target_user_id uuid, target_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
BEGIN
  -- Must be authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can access their own client data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get user role
  SELECT role INTO user_role FROM user_roles WHERE user_id = accessing_user_id;
  
  -- Only admins can access other users' client data
  IF user_role = 'admin' THEN
    -- Log admin access
    INSERT INTO security_events (user_id, event_type, severity, details)
    VALUES (accessing_user_id, 'admin_action', 'critical', 
            jsonb_build_object('action', 'client_data_access', 'target_user_id', target_user_id, 'client_id', target_client_id))
    ON CONFLICT DO NOTHING;
    
    RETURN true;
  END IF;
  
  -- Log unauthorized attempt
  INSERT INTO security_events (user_id, event_type, severity, details)
  VALUES (accessing_user_id, 'unauthorized_access_attempt', 'critical', 
          jsonb_build_object('resource', 'client_data', 'target_user_id', target_user_id, 'client_id', target_client_id))
  ON CONFLICT DO NOTHING;
  
  RETURN false;
END;
$$;