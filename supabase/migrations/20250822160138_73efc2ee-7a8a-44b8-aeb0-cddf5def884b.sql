-- Add updated_at column to airline_codes table
ALTER TABLE airline_codes ADD COLUMN updated_at timestamp with time zone DEFAULT now();

-- Now update all airline logos using airlinelogos.aero pattern
UPDATE airline_codes SET logo_url = 'https://airlinelogos.aero/logos/' || iata_code || '.svg'
WHERE logo_url IS NULL;