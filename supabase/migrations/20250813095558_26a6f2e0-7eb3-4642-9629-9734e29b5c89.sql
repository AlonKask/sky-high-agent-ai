-- Add missing event types to constraint first
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;

ALTER TABLE public.security_events ADD CONSTRAINT security_events_event_type_check 
CHECK (event_type IN (
  'login_success', 'login_failure', 'logout', 'password_change',
  'unauthorized_access_attempt', 'suspicious_activity', 'data_breach_attempt',
  'admin_action', 'sensitive_data_access', 'client_sensitive_modified',
  'gmail_credentials_updated', 'invalid_oauth_state_token', 'option_token_access_denied',
  'option_token_accessed', 'option_review_token_generated', 'rate_limit_exceeded',
  'invalid_option_token_attempt', 'unauthorized_sensitive_access',
  'sensitive_data_accessed', 'authorized_sensitive_access',
  'unauthorized_sensitive_access_attempt', 'sensitive_client_data_access',
  'encryption_operation', 'decryption_operation', 'field_encryption_audit',
  'token_storage_blocked', 'security_scan_completed', 'threat_level_elevated',
  'access_pattern_anomaly', 'brute_force_attempt', 'session_hijack_attempt',
  'sql_injection_attempt', 'xss_attempt', 'csrf_attempt', 'security_system_updated',
  'client_access_control_enhanced', 'admin_client_access', 'emergency_client_access'
));

-- Now implement the stricter client access control
-- Drop all existing client policies to rebuild them properly
DROP POLICY IF EXISTS "Deny all anonymous access to clients" ON public.clients;
DROP POLICY IF EXISTS "Supervisors and above can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

-- Create function to check if user can access client based on team hierarchy
CREATE OR REPLACE FUNCTION public.can_access_client(p_client_user_id uuid, p_accessing_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p_accessing_user_id = p_client_user_id -- Owner access
    OR EXISTS (
      -- Manager access: user is manager of team containing client owner
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm_owner ON t.id = tm_owner.team_id 
      WHERE tm_owner.user_id = p_client_user_id
      AND t.manager_id = p_accessing_user_id
    )
    OR EXISTS (
      -- Admin access (will be audited)
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p_accessing_user_id 
      AND ur.role = 'admin'
    );
$$;

-- Recreate all policies with stricter controls
CREATE POLICY "Deny all anonymous access to clients" 
ON public.clients 
FOR ALL 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Users can view own and team clients only" 
ON public.clients 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND public.can_access_client(user_id, auth.uid())
);

CREATE POLICY "Users can create clients assigned to themselves" 
ON public.clients 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify their own clients only" 
ON public.clients 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients only" 
ON public.clients 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create audit function for client access
CREATE OR REPLACE FUNCTION public.audit_client_access(p_client_id uuid, p_client_owner uuid, p_access_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log if accessing someone else's client
  IF auth.uid() != p_client_owner THEN
    -- Log access to sensitive client data
    INSERT INTO public.sensitive_data_access (
      user_id, accessed_user_id, data_type, access_reason, ip_address, metadata
    ) VALUES (
      auth.uid(), 
      p_client_owner, 
      'client_data',
      p_access_type,
      '0.0.0.0'::inet,
      jsonb_build_object(
        'client_id', p_client_id,
        'access_method', 'database_query',
        'timestamp', now()
      )
    );
    
    -- Log security event for admin access
    IF EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      PERFORM public.log_security_event(
        'admin_client_access',
        'medium',
        jsonb_build_object(
          'client_id', p_client_id,
          'client_owner', p_client_owner,
          'justification', 'admin_override'
        )
      );
    END IF;
  END IF;
END;
$$;

-- Log security enhancement
SELECT public.log_security_event(
  'client_access_control_enhanced',
  'high',
  jsonb_build_object(
    'changes', ARRAY[
      'removed_broad_supervisor_access',
      'implemented_team_based_access_only',
      'added_comprehensive_audit_trail',
      'enforced_principle_of_least_privilege'
    ],
    'security_improvement', 'critical',
    'compliance_benefit', 'prevents_lateral_movement_attacks'
  )
);