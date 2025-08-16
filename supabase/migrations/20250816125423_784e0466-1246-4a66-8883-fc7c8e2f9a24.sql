-- ABSOLUTE FINAL SECURITY FIX - Fix all remaining functions with empty search_path
-- This should resolve the last security warning

-- 1. Fix get_client_decrypted_preview
CREATE OR REPLACE FUNCTION public.get_client_decrypted_preview(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  user_role app_role;
  client_owner_id uuid;
BEGIN
  -- Get client owner
  SELECT user_id INTO client_owner_id FROM clients WHERE id = p_client_id;
  
  -- Check access
  IF NOT can_access_client_data_ultra_strict(client_owner_id, p_client_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  
  -- Get user role
  SELECT role INTO user_role FROM user_roles WHERE user_id = auth.uid();
  
  -- Return basic preview (no sensitive data)
  SELECT jsonb_build_object(
    'id', id,
    'first_name', first_name,
    'last_name', last_name,
    'email', email,
    'company', company
  ) INTO result
  FROM clients WHERE id = p_client_id;
  
  RETURN result;
END;
$$;

-- 2. Fix get_client_sensitive
CREATE OR REPLACE FUNCTION public.get_client_sensitive(p_client_id uuid)
RETURNS TABLE(id uuid, encrypted_payment_info jsonb, encrypted_ssn text, encrypted_passport_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_allowed boolean;
BEGIN
  -- Resolve client owner
  SELECT c.user_id INTO v_owner FROM clients c WHERE c.id = p_client_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'client not found' USING ERRCODE = '02000';
  END IF;

  -- Authorization: owner or elevated roles
  v_allowed := (auth.uid() = v_owner)
               OR has_role(auth.uid(), 'supervisor'::app_role)
               OR has_role(auth.uid(), 'manager'::app_role)
               OR has_role(auth.uid(), 'admin'::app_role);

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT c.id, c.encrypted_payment_info, c.encrypted_ssn, c.encrypted_passport_number
  FROM clients c WHERE c.id = p_client_id;
END;
$$;

-- 3. Fix get_client_sensitive_data
CREATE OR REPLACE FUNCTION public.get_client_sensitive_data(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  user_role app_role;
  client_owner_id uuid;
BEGIN
  -- Get client owner
  SELECT user_id INTO client_owner_id FROM clients WHERE id = p_client_id;
  
  -- Check access
  IF NOT can_access_client_data_ultra_strict(client_owner_id, p_client_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  
  -- Get user role
  SELECT role INTO user_role FROM user_roles WHERE user_id = auth.uid();
  
  -- Only admins and managers can access sensitive data
  IF user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Insufficient privileges' USING ERRCODE = '42501';
  END IF;
  
  -- Return sensitive data (encrypted)
  SELECT to_jsonb(c) INTO result
  FROM clients c WHERE c.id = p_client_id;
  
  RETURN result;
END;
$$;

-- 4. Fix get_user_teams
CREATE OR REPLACE FUNCTION public.get_user_teams(_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tm.team_id
  FROM team_members tm
  WHERE tm.user_id = _user_id;
$$;

-- 5. Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name');
  RETURN new;
END;
$$;

-- 6. Fix is_team_manager
CREATE OR REPLACE FUNCTION public.is_team_manager(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM teams t
    WHERE t.id = _team_id
    AND t.manager_id = _user_id
  );
$$;

-- 7. Fix log_captcha_verification
CREATE OR REPLACE FUNCTION public.log_captcha_verification(
  p_user_email text, 
  p_result boolean, 
  p_error_message text DEFAULT NULL, 
  p_ip_address inet DEFAULT NULL, 
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log captcha verification attempt
  PERFORM log_security_event(
    'captcha_verification',
    CASE WHEN p_result THEN 'low' ELSE 'medium' END,
    jsonb_build_object(
      'user_email', p_user_email,
      'result', p_result,
      'error_message', p_error_message,
      'ip_address', p_ip_address,
      'user_agent', p_user_agent
    )
  );
END;
$$;

-- 8. Fix update_airline_logo
CREATE OR REPLACE FUNCTION public.update_airline_logo(p_airline_id uuid, p_logo_url text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE airline_codes 
  SET logo_url = p_logo_url
  WHERE id = p_airline_id;
  
  RETURN FOUND;
END;
$$;

-- 9. Fix validate_clients_encrypted
CREATE OR REPLACE FUNCTION public.validate_clients_encrypted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payment_text TEXT;
BEGIN
  -- Only validate when values are provided
  IF NEW.encrypted_ssn IS NOT NULL AND NOT is_base64(NEW.encrypted_ssn) THEN
    RAISE EXCEPTION 'encrypted_ssn must be base64-encoded ciphertext' USING ERRCODE = '22000';
  END IF;

  IF NEW.encrypted_passport_number IS NOT NULL AND NOT is_base64(NEW.encrypted_passport_number) THEN
    RAISE EXCEPTION 'encrypted_passport_number must be base64-encoded ciphertext' USING ERRCODE = '22000';
  END IF;

  IF NEW.encrypted_payment_info IS NOT NULL THEN
    IF jsonb_typeof(NEW.encrypted_payment_info) = 'string' THEN
      payment_text := trim(both '"' from NEW.encrypted_payment_info::text);
      IF NOT is_base64(payment_text) THEN
        RAISE EXCEPTION 'encrypted_payment_info must be base64 string or object with ciphertext' USING ERRCODE = '22000';
      END IF;
    ELSIF jsonb_typeof(NEW.encrypted_payment_info) = 'object' THEN
      IF COALESCE(NEW.encrypted_payment_info->>'ciphertext','') = '' OR NOT is_base64(NEW.encrypted_payment_info->>'ciphertext') THEN
        RAISE EXCEPTION 'encrypted_payment_info.ciphertext must be base64-encoded' USING ERRCODE = '22000';
      END IF;
    ELSE
      RAISE EXCEPTION 'encrypted_payment_info must be a base64 string or object' USING ERRCODE = '22000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;