-- Migrate airline logo URLs from AirHex to GitHub + jsDelivr CDN (watermark-free)

-- Update all airline logo URLs to use GitHub + jsDelivr CDN (urbullet repository - IATA-based)
UPDATE airline_codes 
SET 
  logo_url = 'https://cdn.jsdelivr.net/gh/urbullet/iata-airelines-logos@master/' || iata_code || '.png',
  updated_at = now()
WHERE logo_url LIKE '%airhex%' OR logo_url LIKE '%flightaware%';