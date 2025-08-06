-- Fix missing foreign key relationship and consolidate RBD data structure
-- This will resolve the "Could not find a relationship" error

-- First, add the missing foreign key constraint
ALTER TABLE public.airline_rbd_assignments 
ADD CONSTRAINT fk_airline_rbd_assignments_airline_id 
FOREIGN KEY (airline_id) REFERENCES public.airline_codes(id) ON DELETE CASCADE;

-- Update the search_airlines function to properly count RBDs with the new relationship
CREATE OR REPLACE FUNCTION public.search_airlines(search_term text, page_limit integer DEFAULT 50, page_offset integer DEFAULT 0)
RETURNS TABLE(id uuid, iata_code text, icao_code text, name text, country text, alliance text, logo_url text, created_at timestamp with time zone, rbd_count bigint, total_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.iata_code,
    a.icao_code,
    a.name,
    a.country,
    a.alliance,
    a.logo_url,
    a.created_at,
    COUNT(DISTINCT ara.id) as rbd_count,
    COUNT(*) OVER() as total_count
  FROM public.airline_codes a
  LEFT JOIN public.airline_rbd_assignments ara ON a.id = ara.airline_id AND ara.is_active = true
  WHERE 
    CASE 
      WHEN search_term IS NULL OR search_term = '' THEN TRUE
      ELSE 
        to_tsvector('english', a.name || ' ' || COALESCE(a.country, '') || ' ' || a.iata_code || ' ' || COALESCE(a.icao_code, '') || ' ' || COALESCE(a.alliance, ''))
        @@ plainto_tsquery('english', search_term)
        OR a.iata_code ILIKE '%' || search_term || '%'
        OR a.name ILIKE '%' || search_term || '%'
        OR COALESCE(a.country, '') ILIKE '%' || search_term || '%'
        OR COALESCE(a.alliance, '') ILIKE '%' || search_term || '%'
    END
  GROUP BY a.id, a.iata_code, a.icao_code, a.name, a.country, a.alliance, a.logo_url, a.created_at
  ORDER BY 
    CASE WHEN a.iata_code ILIKE search_term || '%' THEN 1 ELSE 2 END,
    a.name
  LIMIT page_limit
  OFFSET page_offset;
END;
$function$

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