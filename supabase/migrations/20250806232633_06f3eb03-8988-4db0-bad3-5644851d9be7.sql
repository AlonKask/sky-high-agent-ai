-- Add function to get RBDs for a specific airline
CREATE OR REPLACE FUNCTION public.get_airline_rbds(airline_uuid uuid)
RETURNS TABLE(
  id uuid,
  booking_class_code text,
  service_class text,
  class_description text,
  booking_priority integer,
  is_active boolean,
  effective_from date,
  effective_until date,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ara.id,
    ara.booking_class_code,
    ara.service_class,
    ara.class_description,
    ara.booking_priority,
    ara.is_active,
    ara.effective_from,
    ara.effective_until,
    ara.created_at,
    ara.updated_at
  FROM public.airline_rbd_assignments ara
  WHERE ara.airline_id = airline_uuid
  ORDER BY ara.service_class, ara.booking_priority, ara.booking_class_code;
END;
$function$