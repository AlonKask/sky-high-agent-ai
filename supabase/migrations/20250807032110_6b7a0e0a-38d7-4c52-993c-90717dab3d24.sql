-- Drop the existing search_airports function and recreate it with priority
DROP FUNCTION IF EXISTS public.search_airports(text, integer, integer);

-- Recreate the search_airports function to include priority and order by it
CREATE OR REPLACE FUNCTION public.search_airports(search_term text, page_limit integer DEFAULT 50, page_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, iata_code text, icao_code text, name text, city text, country text, latitude numeric, longitude numeric, timezone text, priority integer, created_at timestamp with time zone, total_count bigint)
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
    a.city,
    a.country,
    a.latitude,
    a.longitude,
    a.timezone,
    a.priority,
    a.created_at,
    COUNT(*) OVER() as total_count
  FROM public.airport_codes a
  WHERE 
    CASE 
      WHEN search_term IS NULL OR search_term = '' THEN TRUE
      ELSE 
        to_tsvector('english', a.name || ' ' || a.city || ' ' || a.country || ' ' || a.iata_code || ' ' || COALESCE(a.icao_code, ''))
        @@ plainto_tsquery('english', search_term)
        OR a.iata_code ILIKE '%' || search_term || '%'
        OR a.name ILIKE '%' || search_term || '%'
        OR a.city ILIKE '%' || search_term || '%'
        OR a.country ILIKE '%' || search_term || '%'
    END
  ORDER BY 
    CASE WHEN a.iata_code ILIKE search_term || '%' THEN 1 ELSE 2 END,
    a.city,
    a.priority DESC,
    a.name
  LIMIT page_limit
  OFFSET page_offset;
END;
$function$

-- Create function to get airports grouped by city
CREATE OR REPLACE FUNCTION public.search_airports_grouped(search_term text, page_limit integer DEFAULT 1000, page_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, iata_code text, icao_code text, name text, city text, country text, latitude numeric, longitude numeric, timezone text, priority integer, created_at timestamp with time zone, city_airport_count bigint, total_count bigint)
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
    a.city,
    a.country,
    a.latitude,
    a.longitude,
    a.timezone,
    a.priority,
    a.created_at,
    COUNT(*) OVER(PARTITION BY a.city) as city_airport_count,
    COUNT(*) OVER() as total_count
  FROM public.airport_codes a
  WHERE 
    CASE 
      WHEN search_term IS NULL OR search_term = '' THEN TRUE
      ELSE 
        to_tsvector('english', a.name || ' ' || a.city || ' ' || a.country || ' ' || a.iata_code || ' ' || COALESCE(a.icao_code, ''))
        @@ plainto_tsquery('english', search_term)
        OR a.iata_code ILIKE '%' || search_term || '%'
        OR a.name ILIKE '%' || search_term || '%'
        OR a.city ILIKE '%' || search_term || '%'
        OR a.country ILIKE '%' || search_term || '%'
    END
  ORDER BY 
    a.city,
    a.priority DESC,
    a.name
  LIMIT page_limit
  OFFSET page_offset;
END;
$function$