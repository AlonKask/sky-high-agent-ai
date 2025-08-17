-- Fix 1: Remove duplicate log_security_event functions and create single clean version
DROP FUNCTION IF EXISTS public.log_security_event(text, text, jsonb);
DROP FUNCTION IF EXISTS public.log_security_event(uuid, text, jsonb);

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text DEFAULT 'medium',
  p_details jsonb DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details,
    user_agent,
    ip_address
  ) VALUES (
    auth.uid(),
    p_event_type,
    p_severity,
    p_details || jsonb_build_object(
      'timestamp', now(),
      'session_id', current_setting('request.jwt.claims', true)::jsonb->>'session_id'
    ),
    current_setting('request.headers', true)::jsonb->>'user-agent',
    inet(current_setting('request.headers', true)::jsonb->>'x-forwarded-for')
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Silent fail for security logging to not break operations
    NULL;
END;
$$;

-- Fix 2: Update security_events constraint to allow all valid event types
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;
ALTER TABLE public.security_events ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type IN (
  'login_attempt', 'logout', 'password_change', 'email_change',
  'unauthorized_access_attempt', 'data_breach_attempt', 'suspicious_activity',
  'rate_limit_exceeded', 'invalid_token', 'session_expired',
  'client_data_access', 'financial_data_access', 'communication_access',
  'token_access', 'sensitive_data_access', 'admin_override',
  'emergency_access', 'audit_trail_access', 'security_scan',
  'encryption_operation', 'backup_operation', 'system_maintenance',
  'user_registration', 'profile_update', 'settings_change',
  'gmail_credentials_updated', 'option_review_token_generated',
  'application_log', 'emergency_lockdown_initiated'
));

-- Fix 3: Simplify conflicting RLS policies on clients table
DROP POLICY IF EXISTS "ZERO_TRUST_clients_select" ON public.clients;
DROP POLICY IF EXISTS "ZERO_TRUST_clients_insert" ON public.clients;
DROP POLICY IF EXISTS "ZERO_TRUST_clients_update" ON public.clients;
DROP POLICY IF EXISTS "ZERO_TRUST_clients_delete" ON public.clients;

-- Create simple, non-conflicting RLS policies for clients
CREATE POLICY "clients_select_policy" ON public.clients
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    has_admin_role()
  )
);

CREATE POLICY "clients_insert_policy" ON public.clients
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

CREATE POLICY "clients_update_policy" ON public.clients
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    has_admin_role()
  )
) WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "clients_delete_policy" ON public.clients
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    has_admin_role()
  )
);

-- Fix 4: Create missing zero_trust_client_access function for compatibility
CREATE OR REPLACE FUNCTION public.zero_trust_client_access(
  p_client_id uuid,
  p_operation text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_owner_id uuid;
BEGIN
  -- Get client owner
  SELECT user_id INTO client_owner_id
  FROM public.clients
  WHERE id = p_client_id;
  
  -- Allow access if user owns the client or has admin role
  IF auth.uid() = client_owner_id OR has_admin_role() THEN
    -- Log the access
    PERFORM log_security_event(
      'client_data_access',
      'low',
      jsonb_build_object(
        'client_id', p_client_id,
        'operation', p_operation,
        'owner_access', auth.uid() = client_owner_id
      )
    );
    RETURN true;
  END IF;
  
  -- Log unauthorized attempt
  PERFORM log_security_event(
    'unauthorized_access_attempt',
    'high',
    jsonb_build_object(
      'client_id', p_client_id,
      'operation', p_operation,
      'attempted_by', auth.uid()
    )
  );
  
  RETURN false;
END;
$$;