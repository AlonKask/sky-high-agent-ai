-- Create database functions for city management

-- Function to get all cities with airport counts
CREATE OR REPLACE FUNCTION public.get_cities_with_airports()
RETURNS TABLE(city text, country text, airport_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    a.city,
    a.country,
    COUNT(*) as airport_count
  FROM public.airport_codes a
  GROUP BY a.city, a.country
  ORDER BY a.city, a.country;
END;
$function$

-- Function to find similar cities for duplicate detection
CREATE OR REPLACE FUNCTION public.find_similar_cities(search_city text, similarity_threshold real DEFAULT 0.7)
RETURNS TABLE(id uuid, city text, country text, airport_count bigint, similarity_score real)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH city_counts AS (
    SELECT 
      MIN(a.id) as id,
      a.city,
      a.country,
      COUNT(*) as airport_count
    FROM public.airport_codes a
    GROUP BY a.city, a.country
  )
  SELECT 
    cc.id,
    cc.city,
    cc.country,
    cc.airport_count,
    similarity(cc.city, search_city) as similarity_score
  FROM city_counts cc
  WHERE similarity(cc.city, search_city) >= similarity_threshold
    AND cc.city != search_city
  ORDER BY similarity_score DESC, cc.airport_count DESC;
END;
$function$

-- Function to get city suggestions for autocomplete
CREATE OR REPLACE FUNCTION public.get_city_suggestions(partial_name text, suggestion_limit integer DEFAULT 10)
RETURNS TABLE(city text, country text, airport_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    a.city,
    a.country,
    COUNT(*) as airport_count
  FROM public.airport_codes a
  WHERE 
    CASE 
      WHEN partial_name IS NULL OR partial_name = '' THEN TRUE
      ELSE 
        a.city ILIKE '%' || partial_name || '%'
        OR a.country ILIKE '%' || partial_name || '%'
    END
  GROUP BY a.city, a.country
  ORDER BY 
    CASE WHEN a.city ILIKE partial_name || '%' THEN 1 ELSE 2 END,
    COUNT(*) DESC,
    a.city
  LIMIT suggestion_limit;
END;
$function$

-- Function to merge cities by updating airport records
CREATE OR REPLACE FUNCTION public.merge_cities(source_cities jsonb, target_city text, target_country text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  source_city record;
  updated_count integer := 0;
BEGIN
  -- Loop through source cities and update all airports to use target city/country
  FOR source_city IN 
    SELECT * FROM jsonb_to_recordset(source_cities) AS x(city text, country text)
  LOOP
    UPDATE public.airport_codes
    SET 
      city = target_city,
      country = target_country,
      updated_at = now()
    WHERE 
      city = source_city.city 
      AND country = source_city.country
      AND (city != target_city OR country != target_country);
    
    GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  END LOOP;
  
  RETURN updated_count;
END;
$function$