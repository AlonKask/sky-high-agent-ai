-- Replace non-working airlinelogos.aero URLs with better alternatives for major airlines
UPDATE airline_codes SET logo_url = 'https://logos.world/delta-air-lines-logo' WHERE iata_code = 'DL';
UPDATE airline_codes SET logo_url = 'https://logos.world/united-airlines-logo' WHERE iata_code = 'UA';
UPDATE airline_codes SET logo_url = 'https://logos.world/lufthansa-logo' WHERE iata_code = 'LH';
UPDATE airline_codes SET logo_url = 'https://logos.world/british-airways-logo' WHERE iata_code = 'BA';
UPDATE airline_codes SET logo_url = 'https://logos.world/emirates-logo' WHERE iata_code = 'EK';
UPDATE airline_codes SET logo_url = 'https://logos.world/qatar-airways-logo' WHERE iata_code = 'QR';
UPDATE airline_codes SET logo_url = 'https://logos.world/singapore-airlines-logo' WHERE iata_code = 'SQ';
UPDATE airline_codes SET logo_url = 'https://logos.world/cathay-pacific-logo' WHERE iata_code = 'CX';
UPDATE airline_codes SET logo_url = 'https://logos.world/japan-airlines-logo' WHERE iata_code = 'JL';
UPDATE airline_codes SET logo_url = 'https://logos.world/ana-all-nippon-airways-logo' WHERE iata_code = 'NH';
UPDATE airline_codes SET logo_url = 'https://logos.world/klm-logo' WHERE iata_code = 'KL';
UPDATE airline_codes SET logo_url = 'https://logos.world/turkish-airlines-logo' WHERE iata_code = 'TK';
UPDATE airline_codes SET logo_url = 'https://logos.world/swiss-international-air-lines-logo' WHERE iata_code = 'LX';
UPDATE airline_codes SET logo_url = 'https://logos.world/austrian-airlines-logo' WHERE iata_code = 'OS';
UPDATE airline_codes SET logo_url = 'https://logos.world/iberia-logo' WHERE iata_code = 'IB';
UPDATE airline_codes SET logo_url = 'https://logos.world/tap-air-portugal-logo' WHERE iata_code = 'TP';
UPDATE airline_codes SET logo_url = 'https://logos.world/alitalia-logo' WHERE iata_code = 'AZ';
UPDATE airline_codes SET logo_url = 'https://logos.world/sas-scandinavian-airlines-logo' WHERE iata_code = 'SK';
UPDATE airline_codes SET logo_url = 'https://logos.world/finnair-logo' WHERE iata_code = 'AY';
UPDATE airline_codes SET logo_url = 'https://logos.world/etihad-airways-logo' WHERE iata_code = 'EY';

-- Update some other major airlines with working URLs
UPDATE airline_codes SET logo_url = 'https://logos.world/southwest-airlines-logo' WHERE iata_code = 'WN';
UPDATE airline_codes SET logo_url = 'https://logos.world/jetblue-airways-logo' WHERE iata_code = 'B6';
UPDATE airline_codes SET logo_url = 'https://logos.world/air-china-logo' WHERE iata_code = 'CA';
UPDATE airline_codes SET logo_url = 'https://logos.world/china-eastern-airlines-logo' WHERE iata_code = 'MU';
UPDATE airline_codes SET logo_url = 'https://logos.world/china-southern-airlines-logo' WHERE iata_code = 'CZ';
UPDATE airline_codes SET logo_url = 'https://logos.world/korean-air-logo' WHERE iata_code = 'KE';
UPDATE airline_codes SET logo_url = 'https://logos.world/asiana-airlines-logo' WHERE iata_code = 'OZ';
UPDATE airline_codes SET logo_url = 'https://logos.world/qantas-logo' WHERE iata_code = 'QF';
UPDATE airline_codes SET logo_url = 'https://logos.world/jetstar-logo' WHERE iata_code = 'JQ';
UPDATE airline_codes SET logo_url = 'https://logos.world/virgin-australia-logo' WHERE iata_code = 'VA';

-- Update timestamp for modified records
UPDATE airline_codes SET updated_at = now() WHERE logo_url LIKE '%logos.world%';