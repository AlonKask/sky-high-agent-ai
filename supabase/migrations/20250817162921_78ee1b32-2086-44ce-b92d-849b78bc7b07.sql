-- Fix the mask_sensitive_data function to include proper search_path parameter (SECURITY WARNING FIX)
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data text, mask_type text DEFAULT 'email'::text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE STRICT
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  CASE mask_type
    WHEN 'email' THEN
      RETURN CASE 
        WHEN data ~ '^[^@]+@[^@]+\.[^@]+$' THEN 
          SUBSTRING(data FROM 1 FOR 3) || '***@' || SPLIT_PART(data, '@', 2)
        ELSE data
      END;
    WHEN 'phone' THEN
      RETURN CASE 
        WHEN LENGTH(data) >= 10 THEN 
          'XXX-XXX-' || RIGHT(data, 4)
        ELSE data
      END;
    WHEN 'ssn' THEN
      RETURN CASE 
        WHEN LENGTH(data) >= 9 THEN 
          'XXX-XX-' || RIGHT(data, 4)
        ELSE data
      END;
    WHEN 'passport' THEN
      RETURN CASE 
        WHEN LENGTH(data) >= 6 THEN 
          REPEAT('X', LENGTH(data) - 4) || RIGHT(data, 4)
        ELSE data
      END;
    ELSE
      RETURN data
  END CASE;
END;
$function$;

-- Create business hours validation function for enhanced security
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
  -- Get current user role
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Admins bypass business hours restrictions
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Get current hour and day (0 = Sunday, 6 = Saturday)
  current_hour := EXTRACT(hour FROM now() AT TIME ZONE 'UTC');
  current_day := EXTRACT(dow FROM now() AT TIME ZONE 'UTC');
  
  -- Allow access during business hours (9 AM to 6 PM, Monday to Friday)
  IF current_day BETWEEN 1 AND 5 AND current_hour BETWEEN 9 AND 18 THEN
    RETURN true;
  END IF;
  
  -- Log after-hours access attempt
  PERFORM public.log_security_event(
    'after_hours_access_attempt',
    'medium',
    jsonb_build_object(
      'current_hour', current_hour,
      'current_day', current_day,
      'user_role', user_role
    )
  );
  
  RETURN false;
END;
$function$;

-- Enhanced gmail credentials security function
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    PERFORM public.log_security_event(
      'gmail_credentials_unauthorized_access',
      'high',
      jsonb_build_object('target_user_id', target_user_id, 'reason', 'unauthenticated')
    );
    RETURN false;
  END IF;
  
  -- Users can only access their own gmail credentials
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get accessing user's role for potential emergency access
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  -- Log unauthorized attempt
  PERFORM public.log_security_event(
    'gmail_credentials_unauthorized_access',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'accessing_user_role', user_role,
      'requires_investigation', true
    )
  );
  
  RETURN false;
END;
$function$;

-- Enhanced function to check sensitive client field access
CREATE OR REPLACE FUNCTION public.can_access_sensitive_client_fields(client_owner_id uuid, client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_assigned boolean := false;
  is_team_member boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check business hours for non-admin access
  IF NOT public.validate_business_hours_access() THEN
    RETURN false;
  END IF;
  
  -- Allow client owner access
  IF accessing_user_id = client_owner_id THEN
    PERFORM public.log_security_event(
      'sensitive_client_field_access',
      'medium',
      jsonb_build_object(
        'client_id', client_id,
        'access_type', 'owner',
        'fields_accessed', 'sensitive'
      )
    );
    RETURN true;
  END IF;
  
  -- Get accessing user's role
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  -- Check if specifically assigned to this client
  SELECT EXISTS(
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = client_id
    AND ca.agent_id = accessing_user_id
    AND ca.is_active = true
    AND (ca.expires_at IS NULL OR ca.expires_at > now())
  ) INTO is_assigned;
  
  IF is_assigned THEN
    PERFORM public.log_security_event(
      'sensitive_client_field_access',
      'medium',
      jsonb_build_object(
        'client_id', client_id,
        'access_type', 'assigned_agent',
        'fields_accessed', 'sensitive'
      )
    );
    RETURN true;
  END IF;
  
  -- For managers/supervisors: only if client owner is their team member
  IF user_role IN ('manager', 'supervisor') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = client_owner_id
    ) INTO is_team_member;
    
    IF is_team_member THEN
      PERFORM public.log_security_event(
        'sensitive_client_field_access',
        'high',
        jsonb_build_object(
          'client_id', client_id,
          'access_type', 'supervisor_override',
          'team_member_id', client_owner_id,
          'requires_audit', true
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: emergency access with heavy logging
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'sensitive_client_field_access',
      'critical',
      jsonb_build_object(
        'client_id', client_id,
        'access_type', 'admin_emergency',
        'requires_justification', true,
        'compliance_review_required', true
      )
    );
    RETURN true;
  END IF;
  
  -- Log denied access
  PERFORM public.log_security_event(
    'sensitive_client_field_access_denied',
    'high',
    jsonb_build_object(
      'client_id', client_id,
      'client_owner_id', client_owner_id,
      'accessing_user_id', accessing_user_id,
      'user_role', user_role,
      'denial_reason', 'insufficient_privileges'
    )
  );
  
  RETURN false;
END;
$function$;