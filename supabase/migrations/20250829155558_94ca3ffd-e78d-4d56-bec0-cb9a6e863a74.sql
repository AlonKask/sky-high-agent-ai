-- Create function to get quotes for booking (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_quotes_for_booking(p_quote_ids uuid[])
RETURNS TABLE(
  id uuid,
  user_id uuid,
  request_id uuid,
  client_id uuid,
  route text,
  fare_type text,
  segments jsonb,
  total_segments integer,
  net_price numeric,
  markup numeric,
  total_price numeric,
  adults_count integer,
  children_count integer,
  infants_count integer,
  passenger_pricing jsonb,
  valid_until date,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Return quotes data for booking
  RETURN QUERY
  SELECT 
    q.id,
    q.user_id,
    q.request_id,
    q.client_id,
    q.route,
    q.fare_type,
    q.segments,
    q.total_segments,
    q.net_price,
    q.markup,
    q.total_price,
    q.adults_count,
    q.children_count,
    q.infants_count,
    q.passenger_pricing,
    q.valid_until,
    q.status,
    q.created_at,
    q.updated_at
  FROM public.quotes q
  WHERE q.id = ANY(p_quote_ids);
END;
$function$;

-- Create function to get client data for booking (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_client_for_booking(p_client_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  company text,
  preferred_class text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Return basic client data needed for booking (no sensitive data)
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.company,
    c.preferred_class,
    c.created_at
  FROM public.clients c
  WHERE c.id = p_client_id;
END;
$function$;