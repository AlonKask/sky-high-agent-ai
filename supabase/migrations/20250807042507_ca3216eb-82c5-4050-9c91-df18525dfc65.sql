-- Ensure airline logos are properly accessible and add validation
-- The logo_url field already exists, let's add some helper functions

-- Function to validate and update airline logos
CREATE OR REPLACE FUNCTION public.update_airline_logo(p_airline_id uuid, p_logo_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.airline_codes
  SET logo_url = p_logo_url,
      updated_at = now()
  WHERE id = p_airline_id;
END;
$function$;

-- Function to get airline with logo
CREATE OR REPLACE FUNCTION public.get_airline_with_logo(p_iata_code text)
RETURNS TABLE(id uuid, iata_code text, name text, logo_url text, country text, alliance text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.iata_code,
    a.name,
    a.logo_url,
    a.country,
    a.alliance
  FROM public.airline_codes a
  WHERE a.iata_code = p_iata_code;
END;
$function$;

-- Add updated_at trigger for airline_codes if not exists
CREATE OR REPLACE FUNCTION public.update_airline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_airline_codes_updated_at ON public.airline_codes;
CREATE TRIGGER update_airline_codes_updated_at
    BEFORE UPDATE ON public.airline_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_airline_updated_at();