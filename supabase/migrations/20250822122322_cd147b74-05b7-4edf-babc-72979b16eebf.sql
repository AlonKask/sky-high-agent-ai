-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS public.get_request_details(uuid);

CREATE OR REPLACE FUNCTION public.get_request_details(p_request_id uuid)
RETURNS TABLE(
  request_id uuid,
  request_user_id uuid,
  assigned_to uuid,
  client_id uuid,
  origin text,
  destination text,
  departure_date timestamp with time zone,
  return_date timestamp with time zone,
  adults_count integer,
  children_count integer,
  infants_count integer,
  class_preference text,
  trip_type text,
  special_requirements text,
  budget_min numeric,
  budget_max numeric,
  status text,
  priority text,
  request_created_at timestamp with time zone,
  request_updated_at timestamp with time zone,
  segments jsonb,
  client_first_name text,
  client_last_name text,
  client_email text,
  client_phone text,
  client_company text,
  client_total_spent numeric,
  client_total_bookings integer,
  client_type text,
  quotes jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  request_record record;
  client_record record;
  quotes_data jsonb;
BEGIN
  -- Get request details using correct column names
  SELECT 
    r.id, r.user_id, r.assigned_to, r.client_id, r.origin_airport, r.destination_airport,
    r.departure_date, r.return_date, r.adults_count, r.children_count,
    r.infants_count, r.class_preference, r.request_type, r.special_requirements,
    r.budget_min, r.budget_max, r.status, r.priority, r.created_at, r.updated_at,
    r.segments
  INTO request_record
  FROM public.requests r
  WHERE r.id = p_request_id;
  
  -- Check if request exists
  IF request_record.id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check access permissions using existing function
  IF NOT public.can_access_request(request_record.user_id, request_record.assigned_to) THEN
    -- Log unauthorized access attempt
    PERFORM public.log_security_event(
      'unauthorized_request_access',
      'high',
      jsonb_build_object('request_id', p_request_id, 'user_id', auth.uid())
    );
    RETURN;
  END IF;
  
  -- Get client details
  SELECT 
    c.first_name, c.last_name, c.email, c.phone, c.company,
    c.total_spent, c.total_bookings, c.client_type
  INTO client_record
  FROM public.clients c
  WHERE c.id = request_record.client_id;
  
  -- Get quotes for this request (trying both possible table names)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'user_id', q.user_id,
      'request_id', q.request_id,
      'flight_data', q.flight_data,
      'pricing', q.pricing,
      'is_visible_to_client', q.is_visible_to_client,
      'created_at', q.created_at,
      'updated_at', q.updated_at,
      'quote_number', q.quote_number,
      'status', q.status,
      'notes', q.notes
    )
  ), '[]'::jsonb) INTO quotes_data
  FROM public.quotes q
  WHERE q.request_id = p_request_id;
  
  -- If no quotes found in quotes table, try flight_quotes table
  IF quotes_data = '[]'::jsonb THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', fq.id,
        'user_id', fq.user_id,
        'request_id', fq.request_id,
        'flight_data', fq.flight_data,
        'pricing', fq.pricing,
        'is_visible_to_client', fq.is_visible_to_client,
        'created_at', fq.created_at,
        'updated_at', fq.updated_at,
        'quote_number', fq.quote_number,
        'status', fq.status,
        'notes', fq.notes
      )
    ), '[]'::jsonb) INTO quotes_data
    FROM public.flight_quotes fq
    WHERE fq.request_id = p_request_id;
  END IF;
  
  -- Return the combined data
  RETURN QUERY
  SELECT 
    request_record.id,
    request_record.user_id,
    request_record.assigned_to,
    request_record.client_id,
    request_record.origin_airport,
    request_record.destination_airport,
    request_record.departure_date,
    request_record.return_date,
    request_record.adults_count,
    request_record.children_count,
    request_record.infants_count,
    request_record.class_preference,
    request_record.request_type,
    request_record.special_requirements,
    request_record.budget_min,
    request_record.budget_max,
    request_record.status,
    request_record.priority,
    request_record.created_at,
    request_record.updated_at,
    request_record.segments,
    client_record.first_name,
    client_record.last_name,
    client_record.email,
    client_record.phone,
    client_record.company,
    client_record.total_spent,
    client_record.total_bookings,
    client_record.client_type,
    quotes_data;
END;
$function$;