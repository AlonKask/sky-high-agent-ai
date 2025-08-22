-- Create aircraft_models table
CREATE TABLE public.aircraft_models (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  aliases text[] DEFAULT '{}',
  display_label text NOT NULL,
  manufacturer text NOT NULL,
  family text NOT NULL,
  model text NOT NULL,
  category text NOT NULL,
  icon_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aircraft_models ENABLE ROW LEVEL SECURITY;

-- RLS policies following existing patterns
CREATE POLICY "Business users can view aircraft models"
ON public.aircraft_models
FOR SELECT
USING (is_business_user());

CREATE POLICY "Admins can manage aircraft models"
ON public.aircraft_models
FOR ALL
USING (has_admin_role())
WITH CHECK (has_admin_role());

-- Create search function
CREATE OR REPLACE FUNCTION public.search_aircraft_models(
  search_term text,
  page_limit integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  code text,
  aliases text[],
  display_label text,
  manufacturer text,
  family text,
  model text,
  category text,
  icon_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.code,
    a.aliases,
    a.display_label,
    a.manufacturer,
    a.family,
    a.model,
    a.category,
    a.icon_url,
    a.created_at,
    a.updated_at,
    COUNT(*) OVER() as total_count
  FROM public.aircraft_models a
  WHERE 
    CASE 
      WHEN search_term IS NULL OR search_term = '' THEN TRUE
      ELSE 
        to_tsvector('english', a.display_label || ' ' || a.manufacturer || ' ' || a.family || ' ' || a.model || ' ' || a.code || ' ' || COALESCE(array_to_string(a.aliases, ' '), ''))
        @@ plainto_tsquery('english', search_term)
        OR a.code ILIKE '%' || search_term || '%'
        OR a.display_label ILIKE '%' || search_term || '%'
        OR a.manufacturer ILIKE '%' || search_term || '%'
        OR a.category ILIKE '%' || search_term || '%'
        OR EXISTS (SELECT 1 FROM unnest(a.aliases) AS alias WHERE alias ILIKE '%' || search_term || '%')
    END
  ORDER BY 
    CASE WHEN a.code ILIKE search_term || '%' THEN 1 ELSE 2 END,
    a.manufacturer,
    a.family,
    a.model
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- Insert aircraft models data
INSERT INTO public.aircraft_models (code, aliases, display_label, manufacturer, family, model, category) VALUES
-- Widebody Airbus
('388', ARRAY['A388','A380'], 'Airbus A380-800', 'Airbus', 'A380', 'A380-800', 'Widebody Jet'),
('359', ARRAY['A359','A350'], 'Airbus A350-900', 'Airbus', 'A350', 'A350-900', 'Widebody Jet'),
('351', ARRAY['A351','A35K'], 'Airbus A350-1000', 'Airbus', 'A350', 'A350-1000', 'Widebody Jet'),
('338', ARRAY['A338'], 'Airbus A330-800neo', 'Airbus', 'A330neo', 'A330-800', 'Widebody Jet'),
('339', ARRAY['A339'], 'Airbus A330-900neo', 'Airbus', 'A330neo', 'A330-900', 'Widebody Jet'),
('332', ARRAY['A332'], 'Airbus A330-200', 'Airbus', 'A330', 'A330-200', 'Widebody Jet'),
('333', ARRAY['A333'], 'Airbus A330-300', 'Airbus', 'A330', 'A330-300', 'Widebody Jet'),
('343', ARRAY['A343'], 'Airbus A340-300', 'Airbus', 'A340', 'A340-300', 'Widebody Jet'),
('346', ARRAY['A346'], 'Airbus A340-600', 'Airbus', 'A340', 'A340-600', 'Widebody Jet'),
('342', ARRAY['A342'], 'Airbus A340-200', 'Airbus', 'A340', 'A340-200', 'Widebody Jet'),
('300', ARRAY['A306','A300'], 'Airbus A300-600', 'Airbus', 'A300', 'A300-600', 'Widebody Jet'),
('310', ARRAY['A310','A310-300'], 'Airbus A310-300', 'Airbus', 'A310', 'A310-300', 'Widebody Jet'),

-- Widebody Boeing
('748', ARRAY['B748','747-8','7478'], 'Boeing 747-8 Intercontinental', 'Boeing', '747', '747-8I', 'Widebody Jet'),
('744', ARRAY['B744','747-400','74E','74M'], 'Boeing 747-400', 'Boeing', '747', '747-400', 'Widebody Jet'),
('763', ARRAY['B763','767-300','767-300ER'], 'Boeing 767-300/300ER', 'Boeing', '767', '767-300/300ER', 'Widebody Jet'),
('764', ARRAY['B764','767-400'], 'Boeing 767-400ER', 'Boeing', '767', '767-400ER', 'Widebody Jet'),
('762', ARRAY['B762','767-200'], 'Boeing 767-200/200ER', 'Boeing', '767', '767-200/200ER', 'Widebody Jet'),
('772', ARRAY['B772','77A'], 'Boeing 777-200/200ER', 'Boeing', '777', '777-200/200ER', 'Widebody Jet'),
('77L', ARRAY['777-200LR'], 'Boeing 777-200LR', 'Boeing', '777', '777-200LR', 'Widebody Jet'),
('773', ARRAY['B773','777-300'], 'Boeing 777-300', 'Boeing', '777', '777-300', 'Widebody Jet'),
('77W', ARRAY['777-300ER'], 'Boeing 777-300ER', 'Boeing', '777', '777-300ER', 'Widebody Jet'),
('779', ARRAY['777-9','B779','77X'], 'Boeing 777-9', 'Boeing', '777X', '777-9', 'Widebody Jet'),
('788', ARRAY['B788','787-8'], 'Boeing 787-8 Dreamliner', 'Boeing', '787', '787-8', 'Widebody Jet'),
('789', ARRAY['B789','787-9'], 'Boeing 787-9 Dreamliner', 'Boeing', '787', '787-9', 'Widebody Jet'),
('781', ARRAY['B781','787-10','78J','78X'], 'Boeing 787-10 Dreamliner', 'Boeing', '787', '787-10', 'Widebody Jet'),

-- Narrowbody Airbus
('223', ARRAY['A223','CS3'], 'Airbus A220-300', 'Airbus', 'A220', 'A220-300', 'Narrowbody Jet'),
('221', ARRAY['A221','CS1'], 'Airbus A220-100', 'Airbus', 'A220', 'A220-100', 'Narrowbody Jet'),
('318', ARRAY['A318'], 'Airbus A318', 'Airbus', 'A320 family', 'A318', 'Narrowbody Jet'),
('319', ARRAY['A319'], 'Airbus A319', 'Airbus', 'A320 family', 'A319', 'Narrowbody Jet'),
('31N', ARRAY['A319neo'], 'Airbus A319neo', 'Airbus', 'A320neo family', 'A319neo', 'Narrowbody Jet'),
('320', ARRAY['A320'], 'Airbus A320-200', 'Airbus', 'A320 family', 'A320-200', 'Narrowbody Jet'),
('32N', ARRAY['A20N','A320neo'], 'Airbus A320neo', 'Airbus', 'A320neo family', 'A320neo', 'Narrowbody Jet'),
('321', ARRAY['A321','32B'], 'Airbus A321-200', 'Airbus', 'A320 family', 'A321-200', 'Narrowbody Jet'),
('32Q', ARRAY['A321neo','A21N','321N','32P','A321LR','A321XLR'], 'Airbus A321neo (LR/XLR capable)', 'Airbus', 'A320neo family', 'A321neo', 'Narrowbody Jet'),

-- Narrowbody Boeing
('717', ARRAY['B717','MD95'], 'Boeing 717-200', 'Boeing', '717', '717-200', 'Narrowbody Jet'),
('733', ARRAY['B733','737-300'], 'Boeing 737-300', 'Boeing', '737 Classic', '737-300', 'Narrowbody Jet'),
('734', ARRAY['B734','737-400'], 'Boeing 737-400', 'Boeing', '737 Classic', '737-400', 'Narrowbody Jet'),
('735', ARRAY['B735','737-500'], 'Boeing 737-500', 'Boeing', '737 Classic', '737-500', 'Narrowbody Jet'),
('736', ARRAY['B736','737-600'], 'Boeing 737-600', 'Boeing', '737NG', '737-600', 'Narrowbody Jet'),
('73G', ARRAY['B73G','737-700','73W'], 'Boeing 737-700', 'Boeing', '737NG', '737-700', 'Narrowbody Jet'),
('738', ARRAY['B738','737-800','73H'], 'Boeing 737-800', 'Boeing', '737NG', '737-800', 'Narrowbody Jet'),
('739', ARRAY['B739','737-900','73J'], 'Boeing 737-900/900ER', 'Boeing', '737NG', '737-900/ER', 'Narrowbody Jet'),
('7M7', ARRAY['B737-7','MAX7'], 'Boeing 737 MAX 7', 'Boeing', '737 MAX', '737-7 (MAX 7)', 'Narrowbody Jet'),
('7M8', ARRAY['B737-8','MAX8','737-8'], 'Boeing 737 MAX 8', 'Boeing', '737 MAX', '737-8 (MAX 8)', 'Narrowbody Jet'),
('7M9', ARRAY['B737-9','MAX9','737-9'], 'Boeing 737 MAX 9', 'Boeing', '737 MAX', '737-9 (MAX 9)', 'Narrowbody Jet'),
('7M10', ARRAY['B737-10','MAX10','737-10'], 'Boeing 737 MAX 10', 'Boeing', '737 MAX', '737-10 (MAX 10)', 'Narrowbody Jet'),
('752', ARRAY['B752','757-200'], 'Boeing 757-200', 'Boeing', '757', '757-200', 'Narrowbody Jet'),
('753', ARRAY['B753','757-300'], 'Boeing 757-300', 'Boeing', '757', '757-300', 'Narrowbody Jet'),

-- Regional Jets
('E70', ARRAY['E170'], 'Embraer 170', 'Embraer', 'E-Jet (E1)', 'E170', 'Regional Jet'),
('E75', ARRAY['E175','E75S','E75L'], 'Embraer 175', 'Embraer', 'E-Jet (E1)', 'E175', 'Regional Jet'),
('E90', ARRAY['E190'], 'Embraer 190 / 190-E2', 'Embraer', 'E-Jet / E2', 'E190 / E190-E2', 'Regional Jet'),
('E95', ARRAY['E195'], 'Embraer 195 / 195-E2', 'Embraer', 'E-Jet / E2', 'E195 / E195-E2', 'Regional Jet'),
('ER3', ARRAY['ERJ135','E135'], 'Embraer ERJ-135', 'Embraer', 'ERJ', 'ERJ-135', 'Regional Jet'),
('ER4', ARRAY['ERJ145','E145'], 'Embraer ERJ-145', 'Embraer', 'ERJ', 'ERJ-145', 'Regional Jet'),
('CR2', ARRAY['CRJ200','CRJ100'], 'Bombardier CRJ-100/200', 'Bombardier', 'CRJ', 'CRJ-100/200', 'Regional Jet'),
('CR7', ARRAY['CRJ700','CRJ705'], 'Bombardier CRJ-700/705', 'Bombardier', 'CRJ', 'CRJ-700/705', 'Regional Jet'),
('CR9', ARRAY['CRJ900'], 'Bombardier CRJ-900', 'Bombardier', 'CRJ', 'CRJ-900', 'Regional Jet'),
('CRK', ARRAY['CRJ1000'], 'Bombardier CRJ-1000', 'Bombardier', 'CRJ', 'CRJ-1000', 'Regional Jet'),
('SU9', ARRAY['SSJ100','SU95'], 'Sukhoi Superjet 100', 'UAC', 'Superjet', 'SSJ100', 'Regional Jet'),
('146', ARRAY['BAe146'], 'BAe 146 (all variants)', 'BAe', '146', '146-100/200/300', 'Regional Jet'),
('AR1', ARRAY['RJ100'], 'Avro RJ100', 'BAe', 'Avro RJ', 'RJ100', 'Regional Jet'),
('AR8', ARRAY['RJ85'], 'Avro RJ85', 'BAe', 'Avro RJ', 'RJ85', 'Regional Jet'),
('AR7', ARRAY['RJ70'], 'Avro RJ70', 'BAe', 'Avro RJ', 'RJ70', 'Regional Jet'),
('J32', ARRAY['Do328JET','328JET'], 'Dornier 328JET', 'Dornier', '328JET', '328-300 Jet', 'Regional Jet'),

-- Turboprops
('AT4', ARRAY['ATR42','AT5'], 'ATR 42 (all)', 'ATR', 'ATR 42', '-300/-320/-500/-600', 'Turboprop'),
('AT7', ARRAY['ATR72','AT6'], 'ATR 72 (all)', 'ATR', 'ATR 72', '-200/-500/-600', 'Turboprop'),
('DH1', ARRAY['DHC8-100'], 'De Havilland Canada Dash 8-100', 'De Havilland Canada', 'Dash 8', 'DHC-8-100', 'Turboprop'),
('DH2', ARRAY['DHC8-200'], 'De Havilland Canada Dash 8-200', 'De Havilland Canada', 'Dash 8', 'DHC-8-200', 'Turboprop'),
('DH3', ARRAY['DHC8-300'], 'De Havilland Canada Dash 8-300', 'De Havilland Canada', 'Dash 8', 'DHC-8-300', 'Turboprop'),
('DH4', ARRAY['Q400','DHC8-400'], 'De Havilland Canada Dash 8 Q400', 'De Havilland Canada', 'Dash 8', 'DHC-8-400', 'Turboprop'),
('SF3', ARRAY['Saab340'], 'Saab 340', 'Saab', '340', '340A/B', 'Turboprop'),
('SB20', ARRAY['Saab2000','S20'], 'Saab 2000', 'Saab', '2000', '2000', 'Turboprop'),
('D38', ARRAY['Do328','DO328'], 'Dornier 328 (turboprop)', 'Dornier', '328', '-100/-300 (TP)', 'Turboprop'),
('D28', ARRAY['Do228'], 'Dornier 228', 'Dornier', '228', '-100/-200', 'Turboprop'),
('EM2', ARRAY['EMB120','BrasilIa'], 'Embraer EMB-120 Brasilia', 'Embraer', 'EMB-120', 'EMB-120', 'Turboprop'),
('EMB', ARRAY['EMB110'], 'Embraer EMB-110 Bandeirante', 'Embraer', 'EMB-110', 'EMB-110', 'Turboprop'),
('BN2', ARRAY['Islander'], 'Britten-Norman BN-2 Islander', 'Britten-Norman', 'BN-2', 'Islander', 'Turboprop'),
('DHT', ARRAY['DHC6','TwinOtter'], 'De Havilland Canada DHC-6 Twin Otter', 'De Havilland Canada', 'DHC-6', 'Twin Otter', 'Turboprop'),
('L410', ARRAY['LET410','L-410'], 'LET L-410 Turbolet', 'LET', 'L-410', 'L-410', 'Turboprop'),
('PC12', ARRAY['PC-12'], 'Pilatus PC-12', 'Pilatus', 'PC-12', 'PC-12', 'Turboprop'),
('C208', ARRAY['Cessna208','Caravan','CN1','CNA'], 'Cessna 208 Caravan', 'Cessna', '208', '208/208B Caravan', 'Turboprop'),

-- Legacy / MDC
('M80', ARRAY['MD80','MD-82','MD-83','MD-88'], 'McDonnell Douglas MD-80 series', 'McDonnell Douglas', 'MD-80', 'MD-81/82/83/88', 'Narrowbody Jet'),
('M90', ARRAY['MD90'], 'McDonnell Douglas MD-90', 'McDonnell Douglas', 'MD-90', 'MD-90-30', 'Narrowbody Jet'),
('D10', ARRAY['DC10','DC-10'], 'McDonnell Douglas DC-10', 'McDonnell Douglas', 'DC-10', 'DC-10-10/30', 'Widebody Jet'),
('M11', ARRAY['MD11','MD-11'], 'McDonnell Douglas MD-11', 'McDonnell Douglas', 'MD-11', 'MD-11', 'Widebody Jet'),
('DC9', ARRAY['DC-9'], 'Douglas DC-9 (all)', 'Douglas', 'DC-9', '-10/-30/-50', 'Narrowbody Jet'),

-- Generic Codes
('32S', ARRAY['A32S','320-family'], 'Airbus A320 family (generic)', 'Airbus', 'A320 family', 'A318/A319/A320/A321', 'Narrowbody Jet'),
('73S', ARRAY['B73S','737-family'], 'Boeing 737 family (generic)', 'Boeing', '737', 'All 737 variants', 'Narrowbody Jet');