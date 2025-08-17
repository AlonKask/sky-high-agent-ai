-- Enhanced security controls for client data protection
-- Create separate access control for sensitive encrypted fields

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