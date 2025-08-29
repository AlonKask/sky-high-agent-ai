-- Fix the ambiguous column reference in get_option_review_for_booking function
CREATE OR REPLACE FUNCTION public.get_option_review_for_booking(p_client_token text)
 RETURNS TABLE(
   id uuid, 
   user_id uuid, 
   client_id uuid, 
   request_id uuid, 
   quote_ids uuid[], 
   review_status text, 
   client_token text, 
   token_expires_at timestamp with time zone, 
   token_used boolean, 
   created_at timestamp with time zone, 
   updated_at timestamp with time zone, 
   metadata jsonb,
   client_first_name text,
   client_last_name text,
   client_email text,
   client_phone text,
   client_company text,
   quotes_data jsonb
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate token format (64 hex chars)
  IF p_client_token !~ '^[0-9a-f]{64}$' THEN
    -- Log invalid token attempt
    PERFORM public.log_security_event(
      'invalid_booking_token_attempt',
      'medium',
      jsonb_build_object('token_format', 'invalid', 'token_length', length(p_client_token))
    );
    RETURN;
  END IF;
  
  -- Log successful token access
  PERFORM public.log_security_event(
    'booking_token_accessed',
    'low',
    jsonb_build_object('timestamp', now())
  );
  
  RETURN QUERY
  SELECT 
    or_.id,
    or_.user_id,
    or_.client_id,
    or_.request_id,
    or_.quote_ids,
    or_.review_status,
    or_.client_token,
    or_.token_expires_at,
    or_.token_used,
    or_.created_at,
    or_.updated_at,
    or_.metadata,
    c.first_name as client_first_name,
    c.last_name as client_last_name,
    c.email as client_email,
    c.phone as client_phone,
    c.company as client_company,
    -- Aggregate quotes data as JSONB
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'route', q.route,
          'fare_type', q.fare_type,
          'total_price', q.total_price,
          'net_price', q.net_price,
          'markup', q.markup,
          'segments', q.segments,
          'total_segments', q.total_segments,
          'adults_count', q.adults_count,
          'children_count', q.children_count,
          'infants_count', q.infants_count,
          'passenger_pricing', q.passenger_pricing,
          'valid_until', q.valid_until,
          'notes', q.notes,
          'status', q.status
        )
      ) FILTER (WHERE q.id IS NOT NULL),
      '[]'::jsonb
    ) as quotes_data
  FROM public.option_reviews or_
  JOIN public.clients c ON or_.client_id = c.id
  LEFT JOIN public.quotes q ON q.id = ANY(or_.quote_ids)
  WHERE or_.client_token = p_client_token 
    AND or_.token_expires_at > now() 
    AND or_.token_used = FALSE
  GROUP BY 
    or_.id, or_.user_id, or_.client_id, or_.request_id, or_.quote_ids,
    or_.review_status, or_.client_token, or_.token_expires_at, or_.token_used,
    or_.created_at, or_.updated_at, or_.metadata,
    c.first_name, c.last_name, c.email, c.phone, c.company;
END;
$function$