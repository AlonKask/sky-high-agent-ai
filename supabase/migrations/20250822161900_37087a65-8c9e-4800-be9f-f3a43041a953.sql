-- Comprehensive airline logo URL migration to AirHex CDN

-- First, update the missing ICAO code for 9 Air (researched: EPA)
UPDATE airline_codes 
SET icao_code = 'EPA', updated_at = now()
WHERE iata_code = 'AQ' AND name = '9 Air' AND icao_code IS NULL;

-- Update all airline logo URLs to use AirHex CDN with ICAO codes as primary
UPDATE airline_codes 
SET 
  logo_url = CASE 
    WHEN icao_code IS NOT NULL THEN 
      'https://content.airhex.com/content/logos/airlines_' || icao_code || '_200_200_s.png'
    ELSE 
      'https://content.airhex.com/content/logos/airlines_' || iata_code || '_200_200_s.png'
  END,
  updated_at = now()
WHERE logo_url IS NOT NULL;

-- Log the migration for audit purposes
INSERT INTO security_events (user_id, event_type, severity, details)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'system_maintenance',
  'low',
  jsonb_build_object(
    'operation', 'airline_logo_migration',
    'description', 'Migrated all airline logos to AirHex CDN for better reliability',
    'timestamp', now(),
    'affected_records', (SELECT COUNT(*) FROM airline_codes WHERE logo_url IS NOT NULL)
  )
);