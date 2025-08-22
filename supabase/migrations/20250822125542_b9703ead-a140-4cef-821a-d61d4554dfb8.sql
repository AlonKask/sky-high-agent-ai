-- Fix the get_request_details RPC function to use correct column names
CREATE OR REPLACE FUNCTION public.get_request_details(request_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  client_id uuid,
  request_type text,
  origin text,
  destination text,
  departure_date date,
  return_date date,
  adults_count integer,
  children_count integer,
  infants_count integer,
  class_preference text,
  budget_range text,
  priority text,
  status text,
  assignment_status text,
  assigned_to uuid,
  notes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  client_first_name text,
  client_last_name text,
  client_email text,
  client_phone text,
  client_company text,
  client_preferred_class text,
  segments jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Security check: ensure user can access this request
  IF NOT EXISTS (
    SELECT 1 FROM public.requests r 
    WHERE r.id = request_id 
    AND (r.user_id = auth.uid() OR r.assigned_to = auth.uid() OR public.has_admin_role())
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.client_id,
    r.request_type,
    r.origin,
    r.destination,
    r.departure_date,
    r.return_date,
    r.adults_count,
    r.children_count,
    r.infants_count,
    r.class_preference,
    r.budget_range,
    r.priority,
    r.status,
    r.assignment_status,
    r.assigned_to,
    r.notes,
    r.created_at,
    r.updated_at,
    c.first_name as client_first_name,
    c.last_name as client_last_name,
    c.email as client_email,
    c.phone as client_phone,
    c.company as client_company,
    c.preferred_class as client_preferred_class,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'from_airport', s.from_airport,
            'to_airport', s.to_airport,
            'departure_date', s.departure_date,
            'adults_count', s.adults_count,
            'children_count', s.children_count,
            'infants_count', s.infants_count
          )
        )
        FROM public.request_segments s
        WHERE s.request_id = r.id
        ORDER BY s.departure_date
      ),
      '[]'::jsonb
    ) as segments
  FROM public.requests r
  LEFT JOIN public.clients c ON r.client_id = c.id
  WHERE r.id = request_id;
END;
$function$;