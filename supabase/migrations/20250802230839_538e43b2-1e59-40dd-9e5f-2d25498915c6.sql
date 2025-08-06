-- Create flight_options table
CREATE TABLE public.flight_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.requests(id),
  client_id UUID REFERENCES public.clients(id),
  quote_id UUID REFERENCES public.quotes(id),
  user_id UUID NOT NULL,
  raw_pnr_text TEXT,
  parsed_segments JSONB DEFAULT '[]'::jsonb,
  price_usd NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  total_duration INTEGER DEFAULT 0, -- minutes
  route_label TEXT,
  best_value BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create airline_codes lookup table
CREATE TABLE public.airline_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  iata_code TEXT NOT NULL UNIQUE,
  icao_code TEXT,
  name TEXT NOT NULL,
  logo_url TEXT,
  country TEXT,
  alliance TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create airport_codes lookup table  
CREATE TABLE public.airport_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  iata_code TEXT NOT NULL UNIQUE,
  icao_code TEXT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  timezone TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flight_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airline_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airport_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flight_options
CREATE POLICY "Users can manage their own flight options"
ON public.flight_options
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for lookup tables (read-only for authenticated users)
CREATE POLICY "Authenticated users can view airline codes"
ON public.airline_codes
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can view airport codes"
ON public.airport_codes
FOR SELECT
USING (true);

-- Update trigger for flight_options
CREATE TRIGGER update_flight_options_updated_at
BEFORE UPDATE ON public.flight_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample airline data
INSERT INTO public.airline_codes (iata_code, icao_code, name, country, alliance) VALUES
('AA', 'AAL', 'American Airlines', 'United States', 'oneworld'),
('DL', 'DAL', 'Delta Air Lines', 'United States', 'SkyTeam'),
('UA', 'UAL', 'United Airlines', 'United States', 'Star Alliance'),
('LH', 'DLH', 'Lufthansa', 'Germany', 'Star Alliance'),
('BA', 'BAW', 'British Airways', 'United Kingdom', 'oneworld'),
('AF', 'AFR', 'Air France', 'France', 'SkyTeam'),
('KL', 'KLM', 'KLM Royal Dutch Airlines', 'Netherlands', 'SkyTeam'),
('LX', 'SWR', 'Swiss International Air Lines', 'Switzerland', 'Star Alliance'),
('OS', 'AUA', 'Austrian Airlines', 'Austria', 'Star Alliance'),
('SN', 'BEL', 'Brussels Airlines', 'Belgium', 'Star Alliance');

-- Insert sample airport data
INSERT INTO public.airport_codes (iata_code, icao_code, name, city, country, timezone) VALUES
('JFK', 'KJFK', 'John F. Kennedy International Airport', 'New York', 'United States', 'America/New_York'),
('LGA', 'KLGA', 'LaGuardia Airport', 'New York', 'United States', 'America/New_York'),
('EWR', 'KEWR', 'Newark Liberty International Airport', 'Newark', 'United States', 'America/New_York'),
('BOS', 'KBOS', 'Logan International Airport', 'Boston', 'United States', 'America/New_York'),
('FRA', 'EDDF', 'Frankfurt Airport', 'Frankfurt', 'Germany', 'Europe/Berlin'),
('LHR', 'EGLL', 'Heathrow Airport', 'London', 'United Kingdom', 'Europe/London'),
('CDG', 'LFPG', 'Charles de Gaulle Airport', 'Paris', 'France', 'Europe/Paris'),
('AMS', 'EHAM', 'Amsterdam Airport Schiphol', 'Amsterdam', 'Netherlands', 'Europe/Amsterdam'),
('ZUR', 'LSZH', 'Zurich Airport', 'Zurich', 'Switzerland', 'Europe/Zurich'),
('VIE', 'LOWW', 'Vienna International Airport', 'Vienna', 'Austria', 'Europe/Vienna');