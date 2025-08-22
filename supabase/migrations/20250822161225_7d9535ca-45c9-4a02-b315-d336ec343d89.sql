-- Revert all logos.world URLs back to consistent airlinelogos.aero format
UPDATE airline_codes 
SET 
  logo_url = 'https://airlinelogos.aero/logos/' || iata_code || '.svg',
  updated_at = now()
WHERE logo_url LIKE '%logos.world%';