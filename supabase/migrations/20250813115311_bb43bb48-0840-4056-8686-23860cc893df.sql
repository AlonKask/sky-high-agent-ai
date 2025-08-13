-- Fix Security Definer View Issue
-- Replace SECURITY DEFINER view with a secure function that requires proper access control

-- Remove the problematic security definer view
DROP VIEW IF EXISTS public.client_access_audit;

-- Create a secure function instead that requires admin role to access audit data
CREATE OR REPLACE FUNCTION public.get_client_access_audit(
  limit_records integer DEFAULT 100,
  offset_records integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  accessing_user_id uuid,
  accessing_user_name text,
  accessing_user_role app_role,
  event_type text,
  severity text,
  client_id text,
  target_user_id text,
  justification text,
  timestamp timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Only admins can access audit data
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required to view audit data';
  END IF;
  
  -- Log the audit access for transparency
  PERFORM public.log_security_event(
    'audit_data_accessed',
    'medium',
    jsonb_build_object(
      'admin_id', auth.uid(),
      'audit_type', 'client_access_audit',
      'records_requested', limit_records
    )
  );
  
  RETURN QUERY
  SELECT 
    se.id,
    se.user_id as accessing_user_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown User') as accessing_user_name,
    ur.role as accessing_user_role,
    se.event_type,
    se.severity,
    se.details->>'client_id' as client_id,
    se.details->>'target_user_id' as target_user_id,
    se.details->>'justification' as justification,
    se.timestamp
  FROM public.security_events se
  LEFT JOIN public.profiles p ON se.user_id = p.id
  LEFT JOIN public.user_roles ur ON se.user_id = ur.user_id
  WHERE se.event_type IN (
    'admin_client_data_access',
    'manager_team_client_access', 
    'supervisor_team_client_access',
    'unauthorized_client_access_attempt',
    'cross_user_client_access',
    'sensitive_client_data_modified',
    'emergency_client_access_granted'
  )
  ORDER BY se.timestamp DESC
  LIMIT limit_records
  OFFSET offset_records;
END;
$$;