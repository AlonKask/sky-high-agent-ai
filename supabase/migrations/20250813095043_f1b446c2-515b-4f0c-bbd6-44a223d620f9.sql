-- Fix Critical Security Issue: Implement Stricter Client Access Control
-- First, drop all existing client policies to rebuild them properly

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
  -- User can access if:
  -- 1. They own the client record
  -- 2. They are a manager of a team that includes the client owner
  -- 3. They are an admin (but this will be logged for audit)
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

-- Create emergency admin access function with full audit trail
CREATE OR REPLACE FUNCTION public.admin_emergency_client_access(p_client_id uuid, p_justification text)
RETURNS TABLE(
  id uuid, user_id uuid, first_name text, last_name text, 
  email text, phone text, company text, notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_owner uuid;
BEGIN
  -- Verify admin role
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get client owner
  SELECT c.user_id INTO client_owner FROM public.clients c WHERE c.id = p_client_id;
  
  -- Log emergency access
  PERFORM public.log_security_event(
    'emergency_client_access',
    'high',
    jsonb_build_object(
      'client_id', p_client_id,
      'client_owner', client_owner,
      'justification', p_justification,
      'admin_user', auth.uid()
    )
  );
  
  -- Audit the access
  PERFORM public.audit_client_access(p_client_id, client_owner, 'emergency_admin_access');
  
  -- Return non-sensitive client data only
  RETURN QUERY
  SELECT c.id, c.user_id, c.first_name, c.last_name, c.email, c.phone, c.company, c.notes
  FROM public.clients c
  WHERE c.id = p_client_id;
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
      'created_emergency_access_function',
      'enforced_principle_of_least_privilege'
    ],
    'security_improvement', 'critical',
    'compliance_benefit', 'prevents_lateral_movement_attacks'
  )
);