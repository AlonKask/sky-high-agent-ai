-- Enhanced ultra-strict client access function with business hours validation
CREATE OR REPLACE FUNCTION public.can_access_client_data_ultra_strict(target_user_id uuid, target_client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_assigned boolean := false;
  is_client_owner boolean := false;
  is_direct_team_member boolean := false;
  business_hours_ok boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check business hours (admins bypass this check inside the function)
  SELECT public.validate_business_hours_access() INTO business_hours_ok;
  IF NOT business_hours_ok THEN
    RETURN false;
  END IF;
  
  -- Check if this is the client owner
  SELECT (target_user_id = accessing_user_id) INTO is_client_owner;
  
  -- Check if agent is specifically assigned to this client
  SELECT EXISTS(
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = target_client_id
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
        'client_id', target_client_id,
        'access_type', CASE WHEN is_client_owner THEN 'owner' ELSE 'assigned' END,
        'user_id', accessing_user_id,
        'timestamp', now()
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
        WHERE ca.client_id = target_client_id
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
            'client_id', target_client_id,
            'role', user_role,
            'validation', 'team_assignment_verified'
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
        'client_id', target_client_id,
        'target_user_id', target_user_id,
        'requires_justification', true,
        'emergency_override', true,
        'compliance_review_required', true
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
      'client_id', target_client_id,
      'user_role', user_role,
      'denial_reason', 'not_assigned_or_authorized',
      'requires_investigation', true
    )
  );
  
  RETURN false;
END;
$function$