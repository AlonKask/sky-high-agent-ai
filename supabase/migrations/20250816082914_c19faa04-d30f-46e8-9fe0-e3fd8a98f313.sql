-- Phase 1: Fix get_user_requests function to remove auth.uid() dependency
DROP FUNCTION IF EXISTS public.get_user_requests();

CREATE OR REPLACE FUNCTION public.get_user_requests(target_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  client_id uuid,
  client_first_name text,
  client_last_name text,
  client_email text,
  origin_airport text,
  destination_airport text,
  departure_date date,
  return_date date,
  adults_count integer,
  children_count integer,
  infants_count integer,
  priority text,
  status text,
  assignment_status text,
  assigned_to uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  resolved_user_id uuid;
BEGIN
  -- Phase 1: Remove auth.uid() dependency and use parameter directly
  resolved_user_id := COALESCE(target_user_id, auth.uid());
  
  -- Log session bypass if target_user_id was provided but auth.uid() is NULL
  IF target_user_id IS NOT NULL AND auth.uid() IS NULL THEN
    PERFORM public.log_security_event(
      'session_bypass_used',
      'medium',
      jsonb_build_object(
        'target_user_id', target_user_id,
        'function', 'get_user_requests',
        'reason', 'auth_uid_null'
      )
    );
  END IF;
  
  -- If no user context at all, return empty
  IF resolved_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.client_id,
    c.first_name as client_first_name,
    c.last_name as client_last_name,
    c.email as client_email,
    r.origin_airport,
    r.destination_airport,
    r.departure_date,
    r.return_date,
    r.adults_count,
    r.children_count,
    r.infants_count,
    r.priority,
    r.status,
    r.assignment_status,
    r.assigned_to,
    r.created_at,
    r.updated_at
  FROM public.travel_requests r
  LEFT JOIN public.clients c ON r.client_id = c.id
  WHERE r.user_id = resolved_user_id
  ORDER BY r.created_at DESC;
END;
$function$;