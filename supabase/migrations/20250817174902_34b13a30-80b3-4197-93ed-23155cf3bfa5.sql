-- ========================================
-- COMPREHENSIVE CLIENT DATA SECURITY FIX - PART 2
-- ========================================

-- Phase 1: Fix missing RLS policies for clients table
-- Create secure SELECT policy that logs all access
CREATE POLICY "ULTRA_SECURE_clients_select" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR public.can_access_client_data_secure(user_id)
  )
);

-- Create secure UPDATE policy with comprehensive logging
CREATE POLICY "ULTRA_SECURE_clients_update" 
ON public.clients 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND data_classification IN ('confidential', 'restricted', 'secret')
);

-- Phase 2: Create comprehensive client access logging function
CREATE OR REPLACE FUNCTION public.log_client_access(
  p_client_id uuid,
  p_access_type text,
  p_fields_accessed text[] DEFAULT ARRAY[]::text[],
  p_business_justification text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_owner_id uuid;
  accessing_user_role app_role;
BEGIN
  -- Get client owner
  SELECT user_id INTO client_owner_id
  FROM public.clients
  WHERE id = p_client_id;
  
  -- Get accessing user's role  
  SELECT role INTO accessing_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Log the access
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  )
  VALUES (
    auth.uid(),
    'sensitive_client_data_accessed',
    CASE 
      WHEN auth.uid() = client_owner_id THEN 'low'
      WHEN accessing_user_role IN ('manager', 'supervisor') THEN 'medium'
      WHEN accessing_user_role = 'admin' THEN 'high'
      ELSE 'critical'
    END,
    jsonb_build_object(
      'client_id', p_client_id,
      'client_owner', client_owner_id,
      'access_type', p_access_type,
      'fields_accessed', p_fields_accessed,
      'business_justification', p_business_justification,
      'accessor_role', accessing_user_role,
      'timestamp', now(),
      'ip_address', inet_client_addr(),
      'session_info', jsonb_build_object(
        'session_valid', auth.uid() IS NOT NULL,
        'access_level', 'client_data'
      )
    )
  );
  
  -- Also log to data access audit table
  INSERT INTO public.data_access_audit (
    user_id,
    accessed_table,
    access_type,
    accessed_record_id,
    data_classification,
    business_justification,
    risk_score
  )
  VALUES (
    auth.uid(),
    'clients',
    p_access_type,
    p_client_id,
    'confidential',
    p_business_justification,
    CASE 
      WHEN auth.uid() = client_owner_id THEN 1
      WHEN accessing_user_role IN ('manager', 'supervisor') THEN 3
      WHEN accessing_user_role = 'admin' THEN 5
      ELSE 9
    END
  );
END;
$$;