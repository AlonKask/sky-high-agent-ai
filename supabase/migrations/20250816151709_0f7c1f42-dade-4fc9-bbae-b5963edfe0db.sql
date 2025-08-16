-- Create client assignments table for granular access control
CREATE TABLE IF NOT EXISTS public.client_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    assigned_by UUID NOT NULL,
    assignment_reason TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(client_id, agent_id)
);

-- Enable RLS on client assignments
ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;

-- Create ultra-strict client data access function
CREATE OR REPLACE FUNCTION public.can_access_client_data_ultra_strict(target_user_id uuid, client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_assigned boolean := false;
  is_client_owner boolean := false;
  is_direct_team_member boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if this is the client owner
  SELECT (target_user_id = accessing_user_id) INTO is_client_owner;
  
  -- Check if agent is specifically assigned to this client
  SELECT EXISTS(
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = can_access_client_data_ultra_strict.client_id
    AND ca.agent_id = accessing_user_id
    AND ca.is_active = true
    AND (ca.expires_at IS NULL OR ca.expires_at > now())
  ) INTO is_assigned;
  
  -- Allow access if user owns the client or is specifically assigned
  IF is_client_owner OR is_assigned THEN
    -- Log legitimate access
    PERFORM public.log_security_event(
      'legitimate_client_access',
      'low',
      jsonb_build_object(
        'client_id', can_access_client_data_ultra_strict.client_id,
        'access_type', CASE WHEN is_client_owner THEN 'owner' ELSE 'assigned' END,
        'user_id', accessing_user_id
      )
    );
    RETURN true;
  END IF;
  
  -- Get accessing user's role for elevated access
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  -- For supervisors/managers: Only allow access to direct team members' assigned clients
  IF user_role IN ('supervisor', 'manager') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_direct_team_member;
    
    -- Additional check: only if client is assigned to team member
    IF is_direct_team_member THEN
      SELECT EXISTS(
        SELECT 1 FROM public.client_assignments ca
        WHERE ca.client_id = can_access_client_data_ultra_strict.client_id
        AND ca.agent_id = target_user_id
        AND ca.is_active = true
      ) INTO is_assigned;
      
      IF is_assigned THEN
        PERFORM public.log_security_event(
          'supervisor_assigned_client_access',
          'medium',
          jsonb_build_object(
            'supervisor_id', accessing_user_id,
            'team_member_id', target_user_id,
            'client_id', can_access_client_data_ultra_strict.client_id,
            'role', user_role
          )
        );
        RETURN true;
      END IF;
    END IF;
  END IF;
  
  -- For admins: Emergency access only with critical logging
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_emergency_client_access',
      'critical',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'client_id', can_access_client_data_ultra_strict.client_id,
        'target_user_id', target_user_id,
        'requires_justification', true,
        'emergency_override', true
      )
    );
    RETURN true;
  END IF;
  
  -- Log unauthorized access attempt
  PERFORM public.log_security_event(
    'unauthorized_client_access_denied',
    'high',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'client_id', can_access_client_data_ultra_strict.client_id,
      'user_role', user_role,
      'denial_reason', 'not_assigned_or_authorized'
    )
  );
  
  RETURN false;
END;
$$;

-- Create function to assign client to agent
CREATE OR REPLACE FUNCTION public.assign_client_to_agent(
  p_client_id uuid,
  p_agent_id uuid,
  p_assignment_reason text DEFAULT 'Manual assignment'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assigning_user_role app_role;
BEGIN
  -- Check if user has permission to assign clients
  SELECT role INTO assigning_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  IF assigning_user_role NOT IN ('admin', 'manager', 'supervisor') THEN
    RAISE EXCEPTION 'Insufficient privileges to assign clients';
  END IF;
  
  -- Insert or update assignment
  INSERT INTO public.client_assignments (
    client_id, agent_id, assigned_by, assignment_reason
  )
  VALUES (p_client_id, p_agent_id, auth.uid(), p_assignment_reason)
  ON CONFLICT (client_id, agent_id)
  DO UPDATE SET
    is_active = true,
    assigned_by = auth.uid(),
    assignment_reason = p_assignment_reason,
    assigned_at = now(),
    updated_at = now();
  
  -- Log assignment
  PERFORM public.log_security_event(
    'client_assignment_created',
    'medium',
    jsonb_build_object(
      'client_id', p_client_id,
      'agent_id', p_agent_id,
      'assigned_by', auth.uid(),
      'reason', p_assignment_reason
    )
  );
END;
$$;

-- Create RLS policies for client_assignments
CREATE POLICY "Users can view their own assignments"
ON public.client_assignments
FOR SELECT
USING (
  auth.uid() = agent_id OR 
  auth.uid() = assigned_by OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can create assignments"
ON public.client_assignments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can update assignments"
ON public.client_assignments
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Auto-assign clients to their creators
CREATE OR REPLACE FUNCTION public.auto_assign_client_to_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Automatically assign client to creator
  INSERT INTO public.client_assignments (
    client_id, agent_id, assigned_by, assignment_reason
  )
  VALUES (
    NEW.id, 
    NEW.user_id, 
    NEW.user_id, 
    'Auto-assigned to creator'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-assignment
CREATE TRIGGER trigger_auto_assign_client
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_client_to_creator();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_client_assignments_active 
ON public.client_assignments (client_id, agent_id) 
WHERE is_active = true;