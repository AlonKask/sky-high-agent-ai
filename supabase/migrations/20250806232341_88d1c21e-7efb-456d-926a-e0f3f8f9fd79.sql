-- Update the search_airlines function to properly count RBDs with the new relationship
DROP FUNCTION IF EXISTS public.search_airlines(text, integer, integer);

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