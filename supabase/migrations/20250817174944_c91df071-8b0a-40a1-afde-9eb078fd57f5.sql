-- ========================================
-- COMPREHENSIVE CLIENT DATA SECURITY FIX - PART 3
-- ========================================

-- Phase 3: Create secure client data access function
CREATE OR REPLACE FUNCTION public.get_client_data_secure(
  p_client_id uuid,
  p_fields text[] DEFAULT ARRAY['id', 'first_name', 'last_name', 'email', 'phone']::text[],
  p_business_justification text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_data jsonb;
  client_owner_id uuid;
  is_authorized boolean := false;
  accessing_user_role app_role;
BEGIN
  -- Validate input
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'Client ID cannot be null';
  END IF;
  
  -- Get client owner and user role
  SELECT user_id INTO client_owner_id
  FROM public.clients
  WHERE id = p_client_id;
  
  IF client_owner_id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  
  SELECT role INTO accessing_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Authorization check
  is_authorized := public.can_access_client_data_secure(client_owner_id);
  
  IF NOT is_authorized THEN
    -- Log unauthorized attempt
    PERFORM public.log_client_access(
      p_client_id,
      'unauthorized_access_attempt',
      p_fields,
      'Access denied - insufficient permissions'
    );
    RAISE EXCEPTION 'Access denied - insufficient permissions';
  END IF;
  
  -- Log authorized access
  PERFORM public.log_client_access(
    p_client_id,
    'authorized_data_access',
    p_fields,
    p_business_justification
  );
  
  -- Build response with only requested fields
  SELECT jsonb_object_agg(
    field_name, 
    CASE field_name
      WHEN 'id' THEN to_jsonb(c.id)
      WHEN 'first_name' THEN to_jsonb(c.first_name)
      WHEN 'last_name' THEN to_jsonb(c.last_name)
      WHEN 'email' THEN to_jsonb(c.email)
      WHEN 'phone' THEN to_jsonb(c.phone)
      WHEN 'company' THEN to_jsonb(c.company)
      WHEN 'preferred_class' THEN to_jsonb(c.preferred_class)
      WHEN 'total_bookings' THEN to_jsonb(c.total_bookings)
      WHEN 'total_spent' THEN to_jsonb(c.total_spent)
      WHEN 'last_trip_date' THEN to_jsonb(c.last_trip_date)
      WHEN 'date_of_birth' THEN to_jsonb(c.date_of_birth)
      WHEN 'client_type' THEN to_jsonb(c.client_type)
      WHEN 'notes' THEN to_jsonb(c.notes)
      WHEN 'created_at' THEN to_jsonb(c.created_at)
      WHEN 'updated_at' THEN to_jsonb(c.updated_at)
      -- Sensitive fields require special handling
      WHEN 'encrypted_ssn' THEN 
        CASE WHEN accessing_user_role IN ('admin', 'manager') 
        THEN to_jsonb('[ENCRYPTED_DATA]') 
        ELSE to_jsonb('[ACCESS_DENIED]') END
      WHEN 'encrypted_passport_number' THEN 
        CASE WHEN accessing_user_role IN ('admin', 'manager') 
        THEN to_jsonb('[ENCRYPTED_DATA]') 
        ELSE to_jsonb('[ACCESS_DENIED]') END
      WHEN 'encrypted_payment_info' THEN 
        CASE WHEN accessing_user_role IN ('admin', 'manager') 
        THEN to_jsonb('[ENCRYPTED_DATA]') 
        ELSE to_jsonb('[ACCESS_DENIED]') END
      ELSE NULL
    END
  ) INTO client_data
  FROM public.clients c, unnest(p_fields) as field_name
  WHERE c.id = p_client_id
  AND field_name = ANY(p_fields);
  
  RETURN COALESCE(client_data, '{}'::jsonb);
END;
$$;

-- Phase 4: Enhanced encryption key management
CREATE TABLE IF NOT EXISTS public.client_encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  key_version integer NOT NULL DEFAULT 1,
  key_fingerprint text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  rotation_reason text,
  UNIQUE(client_id, key_version)
);

-- Enable RLS on encryption keys table
ALTER TABLE public.client_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Only system can manage encryption keys
CREATE POLICY "system_only_encryption_keys" 
ON public.client_encryption_keys 
FOR ALL 
USING (false) 
WITH CHECK (false);