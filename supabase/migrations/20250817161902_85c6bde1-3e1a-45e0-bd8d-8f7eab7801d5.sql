-- Enhanced security controls for client data protection
-- Create separate access control for sensitive encrypted fields

-- 1. Create function for ultra-strict sensitive field access
CREATE OR REPLACE FUNCTION public.can_access_sensitive_client_fields(target_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  client_owner_id uuid;
  is_assigned boolean := false;
  access_session_valid boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_client_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get client owner
  SELECT user_id INTO client_owner_id FROM public.clients WHERE id = target_client_id;
  
  -- Get accessing user's role
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  -- Only client owner can access sensitive fields
  IF accessing_user_id = client_owner_id THEN
    -- Log sensitive data access
    PERFORM public.log_security_event(
      'sensitive_client_fields_accessed',
      'high',
      jsonb_build_object(
        'client_id', target_client_id,
        'accessed_by', accessing_user_id,
        'access_type', 'owner'
      )
    );
    RETURN true;
  END IF;
  
  -- Emergency admin access with critical logging
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_sensitive_fields_emergency_access',
      'critical',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'client_id', target_client_id,
        'client_owner', client_owner_id,
        'requires_immediate_review', true,
        'compliance_alert', true
      )
    );
    RETURN true;
  END IF;
  
  -- All other access denied
  PERFORM public.log_security_event(
    'sensitive_fields_access_denied',
    'critical',
    jsonb_build_object(
      'denied_user_id', accessing_user_id,
      'client_id', target_client_id,
      'client_owner', client_owner_id,
      'user_role', user_role,
      'attempted_fields', 'encrypted_ssn,encrypted_passport_number,encrypted_payment_info'
    )
  );
  
  RETURN false;
END;
$function$

-- 2. Create view for clients with sensitive data protection
CREATE OR REPLACE VIEW public.clients_secure AS
SELECT 
  c.id,
  c.user_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.company,
  c.preferred_class,
  c.notes,
  c.total_bookings,
  c.total_spent,
  c.last_trip_date,
  c.created_at,
  c.updated_at,
  c.date_of_birth,
  c.data_classification,
  c.client_type,
  -- Sensitive fields only accessible with special permission
  CASE 
    WHEN public.can_access_sensitive_client_fields(c.id) THEN c.encrypted_ssn
    ELSE '[REDACTED]'::text
  END as encrypted_ssn,
  CASE 
    WHEN public.can_access_sensitive_client_fields(c.id) THEN c.encrypted_passport_number
    ELSE '[REDACTED]'::text
  END as encrypted_passport_number,
  CASE 
    WHEN public.can_access_sensitive_client_fields(c.id) THEN c.encrypted_payment_info
    ELSE '{"status": "redacted"}'::jsonb
  END as encrypted_payment_info
FROM public.clients c;

-- 3. Add time-based access control function
CREATE OR REPLACE FUNCTION public.validate_business_hours_access()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_hour integer;
  current_day integer;
  user_role app_role;
BEGIN
  -- Get current time info
  current_hour := EXTRACT(hour FROM now() AT TIME ZONE 'UTC');
  current_day := EXTRACT(dow FROM now() AT TIME ZONE 'UTC');
  
  -- Get user role
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Admins have 24/7 access but with logging
  IF user_role = 'admin' THEN
    IF current_hour < 6 OR current_hour > 22 OR current_day IN (0, 6) THEN
      PERFORM public.log_security_event(
        'after_hours_admin_access',
        'high',
        jsonb_build_object(
          'admin_id', auth.uid(),
          'access_time', now(),
          'hour', current_hour,
          'day_of_week', current_day
        )
      );
    END IF;
    RETURN true;
  END IF;
  
  -- Regular business hours: 6 AM to 10 PM, Monday-Saturday
  IF current_hour >= 6 AND current_hour <= 22 AND current_day BETWEEN 1 AND 6 THEN
    RETURN true;
  END IF;
  
  -- Log after-hours access attempt
  PERFORM public.log_security_event(
    'after_hours_access_denied',
    'medium',
    jsonb_build_object(
      'user_id', auth.uid(),
      'user_role', user_role,
      'access_time', now(),
      'hour', current_hour,
      'day_of_week', current_day
    )
  );
  
  RETURN false;
END;
$function$

-- 4. Enhanced client access function with business hours validation
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