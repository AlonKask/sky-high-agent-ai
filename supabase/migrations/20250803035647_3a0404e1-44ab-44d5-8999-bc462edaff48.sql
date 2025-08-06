-- Fix security warnings by adding search_path to functions
DROP FUNCTION IF EXISTS search_airports(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS search_airlines(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS search_booking_classes(TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION search_airports(search_term TEXT, page_limit INTEGER DEFAULT 50, page_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  iata_code TEXT,
  icao_code TEXT,
  name TEXT,
  city TEXT,
  country TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  timezone TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
    a.name
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

CREATE OR REPLACE FUNCTION search_airlines(search_term TEXT, page_limit INTEGER DEFAULT 50, page_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  iata_code TEXT,
  icao_code TEXT,
  name TEXT,
  country TEXT,
  alliance TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ,
  rbd_count BIGINT,
  total_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
        to_tsvector('english', a.name || ' ' || a.country || ' ' || a.iata_code || ' ' || COALESCE(a.icao_code, '') || ' ' || COALESCE(a.alliance, ''))
        @@ plainto_tsquery('english', search_term)
        OR a.iata_code ILIKE '%' || search_term || '%'
        OR a.name ILIKE '%' || search_term || '%'
        OR a.country ILIKE '%' || search_term || '%'
        OR a.alliance ILIKE '%' || search_term || '%'
    END
  GROUP BY a.id, a.iata_code, a.icao_code, a.name, a.country, a.alliance, a.logo_url, a.created_at
  ORDER BY 
    CASE WHEN a.iata_code ILIKE search_term || '%' THEN 1 ELSE 2 END,
    a.name
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

CREATE OR REPLACE FUNCTION search_booking_classes(search_term TEXT, page_limit INTEGER DEFAULT 50, page_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  booking_class_code TEXT,
  service_class TEXT,
  class_description TEXT,
  booking_priority INTEGER,
  active BOOLEAN,
  airline_id UUID,
  airline_name TEXT,
  airline_iata TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bc.id,
    bc.booking_class_code,
    bc.service_class,
    bc.class_description,
    bc.booking_priority,
    bc.active,
    bc.airline_id,
    ac.name as airline_name,
    ac.iata_code as airline_iata,
    bc.created_at,
    bc.updated_at,
    COUNT(*) OVER() as total_count
  FROM public.booking_classes bc
  LEFT JOIN public.airline_codes ac ON bc.airline_id = ac.id
  WHERE 
    CASE 
      WHEN search_term IS NULL OR search_term = '' THEN TRUE
      ELSE 
        to_tsvector('english', bc.booking_class_code || ' ' || bc.service_class || ' ' || COALESCE(bc.class_description, '') || ' ' || COALESCE(ac.name, ''))
        @@ plainto_tsquery('english', search_term)
        OR bc.booking_class_code ILIKE '%' || search_term || '%'
        OR bc.service_class ILIKE '%' || search_term || '%'
        OR bc.class_description ILIKE '%' || search_term || '%'
        OR ac.name ILIKE '%' || search_term || '%'
    END
  ORDER BY 
    CASE WHEN bc.booking_class_code ILIKE search_term || '%' THEN 1 ELSE 2 END,
    bc.booking_class_code
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;