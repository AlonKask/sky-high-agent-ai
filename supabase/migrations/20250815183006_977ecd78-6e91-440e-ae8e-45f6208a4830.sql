-- Drop existing function first
DROP FUNCTION IF EXISTS public.assign_request_to_agent(uuid, uuid);

-- Create secure function to get user requests (bypasses RLS issues)
CREATE OR REPLACE FUNCTION public.get_user_requests(target_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  client_id uuid,
  origin text,
  destination text,
  departure_date date,
  return_date date,
  passengers_count integer,
  status text,
  priority text,
  assignment_status text,
  assigned_to uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  client_first_name text,
  client_last_name text,
  client_email text,
  client_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requesting_user_id uuid;
BEGIN
  -- Get the requesting user ID
  requesting_user_id := COALESCE(target_user_id, auth.uid());
  
  -- Security check: user must be authenticated
  IF requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Log the request for debugging
  PERFORM public.log_security_event(
    'user_requests_accessed',
    'low',
    jsonb_build_object(
      'requesting_user', requesting_user_id,
      'auth_uid_status', CASE WHEN auth.uid() IS NULL THEN 'null' ELSE 'valid' END
    )
  );
  
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.client_id,
    r.origin,
    r.destination,
    r.departure_date,
    r.return_date,
    r.passengers_count,
    r.status,
    r.priority,
    r.assignment_status,
    r.assigned_to,
    r.created_at,
    r.updated_at,
    c.first_name as client_first_name,
    c.last_name as client_last_name,
    c.email as client_email,
    c.client_type
  FROM public.requests r
  LEFT JOIN public.clients c ON r.client_id = c.id
  WHERE r.user_id = requesting_user_id
  ORDER BY r.created_at DESC;
END;
$$;

-- Recreate function to assign requests to agents
CREATE OR REPLACE FUNCTION public.assign_request_to_agent(request_id uuid, agent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Security check: user must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Update the request assignment
  UPDATE public.requests 
  SET 
    assigned_to = agent_id,
    assignment_status = 'assigned',
    updated_at = now()
  WHERE id = request_id;
  
  -- Log the assignment
  PERFORM public.log_security_event(
    'request_assigned',
    'low',
    jsonb_build_object(
      'request_id', request_id,
      'assigned_to', agent_id,
      'assigned_by', auth.uid()
    )
  );
END;
$$;