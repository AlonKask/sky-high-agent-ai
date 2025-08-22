-- Update airline logo_url fields to use FlightAware CDN pattern
-- This ensures consistent, watermark-free logos from a reliable source

-- Update airlines with ICAO codes to use FlightAware pattern
UPDATE airlines 
SET logo_url = 'https://flightaware.com/images/airline_logos/90p/' || icao_code || '.png'
WHERE icao_code IS NOT NULL 
  AND icao_code != '';

-- Clear logo_url for airlines without ICAO codes (will fall back to IATA code display)
UPDATE airlines 
SET logo_url = NULL
WHERE icao_code IS NULL 
  OR icao_code = '';