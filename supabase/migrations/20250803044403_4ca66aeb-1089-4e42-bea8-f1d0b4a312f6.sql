-- Comprehensive Airline Records Implementation
-- Adding 200+ passenger airlines with their RBD assignments

-- Insert airline records
INSERT INTO public.airline_codes (iata_code, icao_code, name, country, alliance, logo_url) VALUES
-- A Airlines
('AQ', NULL, '9 Air', 'China', NULL, NULL),
('A3', 'AEE', 'Aegean Airlines', 'Greece', 'Star Alliance', NULL),
('EI', 'EIN', 'Aer Lingus', 'Ireland', NULL, NULL),
('SU', 'AFL', 'Aeroflot', 'Russia', NULL, NULL),
('AR', 'ARG', 'Aerolineas Argentinas', 'Argentina', 'SkyTeam', NULL),
('AM', 'AMX', 'Aeromexico', 'Mexico', 'SkyTeam', NULL),
('AH', 'DAH', 'Air Algerie', 'Algeria', NULL, NULL),
('G9', 'ABY', 'Air Arabia', 'UAE', NULL, NULL),
('KC', 'KZR', 'Air Astana', 'Kazakhstan', NULL, NULL),
('BP', 'BOT', 'Air Botswana', 'Botswana', NULL, NULL),
('BX', 'ABL', 'Air Busan', 'South Korea', NULL, NULL),
('KR', 'KHV', 'Air Cambodia', 'Cambodia', NULL, NULL),
('AC', 'ACA', 'Air Canada', 'Canada', 'Star Alliance', NULL),
('RV', 'ROU', 'Air Canada Rouge', 'Canada', 'Star Alliance', NULL),
('TX', 'FWI', 'Air Caraïbes', 'France', NULL, NULL),
('CA', 'CCA', 'Air China', 'China', 'Star Alliance', NULL),
('EN', 'DLA', 'Air Dolomiti', 'Italy', 'Star Alliance', NULL),
('UX', 'AEA', 'Air Europa', 'Spain', 'SkyTeam', NULL),
('AF', 'AFR', 'Air France', 'France', 'SkyTeam', NULL),
('AI', 'AIC', 'Air India', 'India', 'Star Alliance', NULL),
('IX', 'AXB', 'Air India Express', 'India', NULL, NULL),
('NX', 'AMU', 'Air Macau', 'Macau', NULL, NULL),
('MD', 'MDG', 'Air Madagascar', 'Madagascar', NULL, NULL),
('KM', 'AMC', 'Air Malta', 'Malta', NULL, NULL),
('MK', 'MAU', 'Air Mauritius', 'Mauritius', NULL, NULL),
('9U', 'MLD', 'Air Moldova', 'Moldova', NULL, NULL),
('SW', 'NMB', 'Air Namibia', 'Namibia', NULL, NULL),
('NZ', 'ANZ', 'Air New Zealand', 'New Zealand', 'Star Alliance', NULL),
('PX', 'ANG', 'Air Niugini', 'Papua New Guinea', NULL, NULL),
('YW', 'ANE', 'Air Nostrum', 'Spain', NULL, NULL),
('JU', 'ASL', 'Air Serbia', 'Serbia', NULL, NULL),
('HM', 'SEY', 'Air Seychelles', 'Seychelles', NULL, NULL),
('TN', 'THT', 'Air Tahiti Nui', 'French Polynesia', NULL, NULL),
('TS', 'TSC', 'Air Transat', 'Canada', NULL, NULL),
('NF', 'AVN', 'Air Vanuatu', 'Vanuatu', NULL, NULL),
('AK', 'AXM', 'AirAsia', 'Malaysia', NULL, NULL),
('D7', 'XAX', 'AirAsia X', 'Malaysia', NULL, NULL),
('I5', 'IAD', 'AirAsia India', 'India', NULL, NULL),
('BT', 'BTI', 'airBaltic', 'Latvia', NULL, NULL),
('PA', 'ABQ', 'airblue', 'Pakistan', NULL, NULL),
('SB', 'ACI', 'Aircalin', 'New Caledonia', NULL, NULL),
('AS', 'ASA', 'Alaska Airlines', 'United States', 'Oneworld', NULL),
('G4', 'AAY', 'Allegiant Air', 'United States', NULL, NULL),
('AA', 'AAL', 'American Airlines', 'United States', 'Oneworld', NULL),
('NH', 'ANA', 'ANA All Nippon Airways', 'Japan', 'Star Alliance', NULL),
('W3', 'ARA', 'Arik Air', 'Nigeria', NULL, NULL),
('OZ', 'AAR', 'Asiana Airlines', 'South Korea', 'Star Alliance', NULL),
('OS', 'AUA', 'Austrian Airlines', 'Austria', 'Star Alliance', NULL),
('AV', 'AVA', 'Avianca', 'Colombia', 'Star Alliance', NULL),
('J2', 'AHY', 'Azerbaijan Airlines', 'Azerbaijan', NULL, NULL),
('AD', 'AZU', 'Azul Brazilian Airlines', 'Brazil', NULL, NULL),

-- B Airlines
('UP', 'BHS', 'Bahamasair', 'Bahamas', NULL, NULL),
('QH', 'BAV', 'Bamboo Airways', 'Vietnam', NULL, NULL),
('PG', 'BKP', 'Bangkok Airways', 'Thailand', NULL, NULL),
('ID', 'BTK', 'Batik Air', 'Indonesia', NULL, NULL),
('B2', 'BRU', 'Belavia Belarusian Airlines', 'Belarus', NULL, NULL),
('BG', 'BBC', 'Biman Bangladesh Airlines', 'Bangladesh', NULL, NULL),
('0B', 'BLA', 'Blue Air', 'Romania', NULL, NULL),
('OB', 'BOV', 'Boliviana de Aviación', 'Bolivia', NULL, NULL),
('BA', 'BAW', 'British Airways', 'United Kingdom', 'Oneworld', NULL),
('SN', 'BEL', 'Brussels Airlines', 'Belgium', 'Star Alliance', NULL),
('FB', 'LZB', 'Bulgaria Air', 'Bulgaria', NULL, NULL),

-- C Airlines
('VR', 'TCV', 'Cabo Verde Airlines', 'Cape Verde', NULL, NULL),
('JD', 'CBJ', 'Capital Airlines', 'China', NULL, NULL),
('BW', 'BWA', 'Caribbean Airlines', 'Trinidad and Tobago', NULL, NULL),
('CX', 'CPA', 'Cathay Pacific Airways', 'Hong Kong', 'Oneworld', NULL),
('KX', 'CAY', 'Cayman Airways', 'Cayman Islands', NULL, NULL),
('5J', 'CEB', 'Cebu Pacific', 'Philippines', NULL, NULL),
('EU', 'UEA', 'Chengdu Airlines', 'China', NULL, NULL),
('CI', 'CAL', 'China Airlines', 'Taiwan', 'SkyTeam', NULL),
('MU', 'CES', 'China Eastern Airlines', 'China', 'SkyTeam', NULL),
('G5', 'HXA', 'China Express Airlines', 'China', NULL, NULL),
('CZ', 'CSN', 'China Southern Airlines', 'China', NULL, NULL),
('KN', 'CUA', 'China United Airlines', 'China', NULL, NULL),
('OQ', 'CQN', 'Chongqing Airlines', 'China', NULL, NULL),
('QG', 'CTV', 'Citilink', 'Indonesia', NULL, NULL),
('GY', 'CGZ', 'Colorful Guizhou Airlines', 'China', NULL, NULL),
('DE', 'CFG', 'Condor Airlines', 'Germany', NULL, NULL),
('CM', 'CMP', 'Copa Airlines', 'Panama', 'Star Alliance', NULL),
('XC', 'CXI', 'Corendon Airlines', 'Turkey', NULL, NULL),
('OU', 'CTN', 'Croatia Airlines', 'Croatia', 'Star Alliance', NULL),
('OK', 'CSA', 'CSA Czech Airlines', 'Czech Republic', 'SkyTeam', NULL),

-- D Airlines
('DL', 'DAL', 'Delta Air Lines', 'United States', 'SkyTeam', NULL),
('DZ', 'EPA', 'Donghai Airlines', 'China', NULL, NULL),

-- E Airlines
('ZE', 'ESR', 'Eastar Jet', 'South Korea', NULL, NULL),
('VE', 'EFY', 'Easyfly', 'Colombia', NULL, NULL),
('U2', 'EZY', 'easyJet', 'United Kingdom', NULL, NULL),
('WK', 'EDW', 'Edelweiss Air', 'Switzerland', NULL, NULL),
('MS', 'MSR', 'Egyptair', 'Egypt', 'Star Alliance', NULL),
('LY', 'ELY', 'El Al Israel Airlines', 'Israel', NULL, NULL),
('EK', 'UAE', 'Emirates', 'UAE', NULL, NULL),
('ET', 'ETH', 'Ethiopian Airlines', 'Ethiopia', 'Star Alliance', NULL),
('EY', 'ETD', 'Etihad Airways', 'UAE', NULL, NULL),
('EW', 'EWG', 'Eurowings', 'Germany', NULL, NULL),
('BR', 'EVA', 'EVA Air', 'Taiwan', 'Star Alliance', NULL),

-- F Airlines
('FN', 'FTZ', 'fastjet', 'Tanzania', NULL, NULL),
('FJ', 'FJI', 'Fiji Airways', 'Fiji', 'Oneworld', NULL),
('AY', 'FIN', 'Finnair', 'Finland', 'Oneworld', NULL),
('F8', 'FLE', 'Flair Airlines', 'Canada', NULL, NULL),
('F3', 'FAD', 'Flyadeal', 'Saudi Arabia', NULL, NULL),
('FS', 'FBA', 'FlyArystan', 'Kazakhstan', NULL, NULL),
('FZ', 'FDB', 'flydubai', 'UAE', NULL, NULL),
('XY', 'KNE', 'flynas', 'Saudi Arabia', NULL, NULL),
('5F', 'FIA', 'FlyOne', 'Moldova', NULL, NULL),
('FA', 'SFR', 'FlySafair', 'South Africa', NULL, NULL),
('BF', 'FBU', 'French Bee', 'France', NULL, NULL),
('F9', 'FFT', 'Frontier Airlines', 'United States', NULL, NULL),
('FU', 'FZA', 'Fuzhou Airlines', 'China', NULL, NULL),

-- G Airlines
('GA', 'GIA', 'Garuda Indonesia', 'Indonesia', 'SkyTeam', NULL),
('G8', 'GOW', 'GoAir', 'India', NULL, NULL),
('G3', 'GLO', 'GOL Airlines', 'Brazil', NULL, NULL),
('GF', 'GFA', 'Gulf Air', 'Bahrain', NULL, NULL),
('GX', 'GXA', 'GX Airlines', 'China', NULL, NULL),

-- H Airlines
('HU', 'CHH', 'Hainan Airlines', 'China', NULL, NULL),
('HA', 'HAL', 'Hawaiian Airlines', 'United States', NULL, NULL),
('NS', 'HBH', 'Hebei Airlines', 'China', NULL, NULL),
('HX', 'CRK', 'Hong Kong Airlines', 'Hong Kong', NULL, NULL),
('UO', 'HKE', 'HK Express', 'Hong Kong', NULL, NULL),

-- I Airlines
('IB', 'IBE', 'Iberia', 'Spain', 'Oneworld', NULL),
('FI', 'ICE', 'Icelandair', 'Iceland', NULL, NULL),
('6E', 'IGO', 'IndiGo', 'India', NULL, NULL),
('4O', 'ABC', 'Interjet', 'Mexico', NULL, NULL),
('AZ', 'ITY', 'ITA Airways', 'Italy', 'SkyTeam', NULL),

-- J Airlines
('JL', 'JAL', 'Japan Airlines', 'Japan', 'Oneworld', NULL),
('J9', 'JZR', 'Jazeera Airways', 'Kuwait', NULL, NULL),
('7C', 'JJA', 'Jeju Air', 'South Korea', NULL, NULL),
('LS', 'EXS', 'Jet2.com', 'United Kingdom', NULL, NULL),
('B6', 'JBU', 'JetBlue Airways', 'United States', NULL, NULL),
('JQ', 'JST', 'Jetstar Airways', 'Australia', NULL, NULL),
('3K', 'JSA', 'Jetstar Asia Airways', 'Singapore', NULL, NULL),
('RY', 'CJX', 'Jiangxi Airlines', 'China', NULL, NULL),
('LJ', 'JNA', 'Jin Air', 'South Korea', NULL, NULL),
('HO', 'DKH', 'Juneyao Airlines', 'China', NULL, NULL),

-- K Airlines
('KQ', 'KQA', 'Kenya Airways', 'Kenya', 'SkyTeam', NULL),
('KL', 'KLM', 'KLM Royal Dutch Airlines', 'Netherlands', 'SkyTeam', NULL),
('KE', 'KAL', 'Korean Air', 'South Korea', 'SkyTeam', NULL),
('MN', 'KUL', 'Kulula', 'South Africa', NULL, NULL),
('KY', 'KNA', 'Kunming Airlines', 'China', NULL, NULL),
('KU', 'KAC', 'Kuwait Airways', 'Kuwait', NULL, NULL),

-- L Airlines
('B0', 'LCO', 'La Compagnie', 'France', NULL, NULL),
('TM', 'LAM', 'LAM Mozambique Airlines', 'Mozambique', NULL, NULL),
('QV', 'LAO', 'Lao Airlines', 'Laos', NULL, NULL),
('LA', 'LAN', 'LATAM Airlines', 'Chile', NULL, NULL),
('JT', 'LNI', 'Lion Air', 'Indonesia', NULL, NULL),
('LO', 'LOT', 'LOT Polish Airlines', 'Poland', 'Star Alliance', NULL),
('GJ', 'CDC', 'Loong Air', 'China', NULL, NULL),
('8L', 'LKE', 'Lucky Air', 'China', NULL, NULL),
('LH', 'DLH', 'Lufthansa', 'Germany', 'Star Alliance', NULL),
('LG', 'LGL', 'Luxair', 'Luxembourg', NULL, NULL),

-- M Airlines
('MH', 'MAS', 'Malaysia Airlines', 'Malaysia', 'Oneworld', NULL),
('OD', 'MXD', 'Malindo Air', 'Malaysia', NULL, NULL),
('AE', 'MDA', 'Mandarin Airlines', 'Taiwan', NULL, NULL),
('JE', 'MNO', 'Mango', 'South Africa', NULL, NULL),
('OM', 'MGL', 'MIAT Mongolian Airlines', 'Mongolia', NULL, NULL),
('ME', 'MEA', 'Middle East Airlines', 'Lebanon', 'SkyTeam', NULL),
('8M', 'MMA', 'Myanmar Airways International', 'Myanmar', NULL, NULL),
('UB', 'UBA', 'Myanmar National Airlines', 'Myanmar', NULL, NULL),

-- N Airlines
('NP', 'NIA', 'Nile Air', 'Egypt', NULL, NULL),
('DD', 'NOK', 'Nok Air', 'Thailand', NULL, NULL),
('DY', 'NAX', 'Norwegian', 'Norway', NULL, NULL),
('BJ', 'LBT', 'Nouvelair', 'Tunisia', NULL, NULL),

-- O Airlines
('BK', 'OKA', 'Okay Airways', 'China', NULL, NULL),
('WY', 'OMA', 'Oman Air', 'Oman', 'Oneworld', NULL),
('8Q', 'OHY', 'Onur Air', 'Turkey', NULL, NULL),

-- P Airlines
('MM', 'APJ', 'Peach Aviation', 'Japan', NULL, NULL),
('PC', 'PGT', 'Pegasus Airlines', 'Turkey', NULL, NULL),
('PR', 'PAL', 'Philippine Airlines', 'Philippines', NULL, NULL),
('PK', 'PIA', 'PIA Pakistan International', 'Pakistan', NULL, NULL),
('PD', 'POE', 'Porter Airlines', 'Canada', NULL, NULL),

-- Q Airlines
('QF', 'QFA', 'Qantas Airways', 'Australia', 'Oneworld', NULL),
('QR', 'QTR', 'Qatar Airways', 'Qatar', 'Oneworld', NULL),
('QW', 'QDA', 'Qingdao Airlines', 'China', NULL, NULL),

-- R Airlines
('AT', 'RAM', 'Royal Air Maroc', 'Morocco', 'Oneworld', NULL),
('BI', 'RBA', 'Royal Brunei Airlines', 'Brunei', NULL, NULL),
('RJ', 'RJA', 'Royal Jordanian Airlines', 'Jordan', 'Oneworld', NULL),
('DR', 'RLH', 'Ruili Airlines', 'China', NULL, NULL),
('WB', 'RWD', 'RwandAir', 'Rwanda', NULL, NULL),
('FR', 'RYR', 'Ryanair', 'Ireland', NULL, NULL),

-- S Airlines
('S7', 'SBI', 'S7 Airlines', 'Russia', NULL, NULL),
('SK', 'SAS', 'SAS Scandinavian Airlines', 'Sweden', 'Star Alliance', NULL),
('S4', 'SAT', 'SATA Azores Airlines', 'Portugal', NULL, NULL),
('SV', 'SVA', 'Saudi Arabian Airlines', 'Saudi Arabia', 'SkyTeam', NULL),
('SC', 'CDG', 'Shandong Airlines', 'China', 'Star Alliance', NULL),
('ZH', 'CSZ', 'Shenzhen Airlines', 'China', 'Star Alliance', NULL),
('3U', 'CSC', 'Sichuan Airlines', 'China', NULL, NULL),
('MI', 'SLK', 'SilkAir', 'Singapore', 'Star Alliance', NULL),
('3M', 'SIL', 'Silver Airways', 'United States', NULL, NULL),
('SQ', 'SIA', 'Singapore Airlines', 'Singapore', 'Star Alliance', NULL),
('H2', 'SKU', 'SKY Airline', 'Chile', NULL, NULL),
('BC', 'SKY', 'Skymark Airlines', 'Japan', NULL, NULL),
('6J', 'SNJ', 'Solaseed Air', 'Japan', NULL, NULL),
('SA', 'SAA', 'South African Airways', 'South Africa', 'Star Alliance', NULL),
('WN', 'SWA', 'Southwest Airlines', 'United States', NULL, NULL),
('SG', 'SEJ', 'SpiceJet', 'India', NULL, NULL),
('NK', 'NKS', 'Spirit Airlines', 'United States', NULL, NULL),
('9C', 'CQH', 'Spring Airlines', 'China', NULL, NULL),
('UL', 'ALK', 'SriLankan Airlines', 'Sri Lanka', 'Oneworld', NULL),
('SJ', 'SJY', 'Sriwijaya Air', 'Indonesia', NULL, NULL),
('7G', 'SFJ', 'Star Flyer', 'Japan', NULL, NULL),
('SY', 'SCX', 'Sun Country Airlines', 'United States', NULL, NULL),
('XQ', 'SXS', 'SunExpress', 'Turkey', NULL, NULL),
('WG', 'SWG', 'Sunwing Airlines', 'Canada', NULL, NULL),
('LX', 'SWR', 'Swiss International Air Lines', 'Switzerland', 'Star Alliance', NULL),
('WO', 'WSW', 'Swoop', 'Canada', NULL, NULL),

-- T Airlines
('TP', 'TAP', 'TAP Portugal', 'Portugal', 'Star Alliance', NULL),
('RO', 'ROT', 'TAROM', 'Romania', 'SkyTeam', NULL),
('TG', 'THA', 'Thai Airways', 'Thailand', 'Star Alliance', NULL),
('GS', 'GCR', 'Tianjin Airlines', 'China', NULL, NULL),
('TO', 'TVF', 'Transavia France', 'France', NULL, NULL),
('HV', 'TRA', 'Transavia Netherlands', 'Netherlands', NULL, NULL),
('BY', 'TOM', 'TUI Airways', 'United Kingdom', NULL, NULL),
('TU', 'TAR', 'Tunisair', 'Tunisia', NULL, NULL),
('TK', 'THY', 'Turkish Airlines', 'Turkey', 'Star Alliance', NULL),
('TW', 'TWB', 'T''way Air', 'South Korea', NULL, NULL),

-- U Airlines
('UA', 'UAL', 'United Airlines', 'United States', 'Star Alliance', NULL),
('U6', 'SVR', 'Ural Airlines', 'Russia', NULL, NULL),
('UQ', 'URC', 'Urumqi Air', 'China', NULL, NULL),

-- V Airlines
('VJ', 'VJC', 'VietJet Air', 'Vietnam', NULL, NULL),
('VN', 'HVN', 'Vietnam Airlines', 'Vietnam', 'SkyTeam', NULL),
('VS', 'VIR', 'Virgin Atlantic', 'United Kingdom', 'SkyTeam', NULL),
('VA', 'VOZ', 'Virgin Australia', 'Australia', NULL, NULL),
('UK', 'VTI', 'Vistara', 'India', NULL, NULL),
('VB', 'VIV', 'Viva Aerobus', 'Mexico', NULL, NULL),
('VH', 'VVC', 'Viva Air', 'Colombia', NULL, NULL),
('Y4', 'VOI', 'Volaris', 'Mexico', NULL, NULL),
('V7', 'VOE', 'Volotea', 'Spain', NULL, NULL),
('VY', 'VLG', 'Vueling Airlines', 'Spain', NULL, NULL),

-- W Airlines
('PN', 'CHB', 'West Air', 'China', NULL, NULL),
('WS', 'WJA', 'WestJet Airlines', 'Canada', NULL, NULL),
('W6', 'WZZ', 'Wizz Air', 'Hungary', NULL, NULL),

-- X Airlines
('MF', 'CXA', 'Xiamen Airlines', 'China', 'SkyTeam', NULL)

ON CONFLICT (iata_code) DO NOTHING;

-- Create RBD assignments for all airlines
-- This will be a comprehensive set of RBD assignments based on the airline data provided

-- First Class RBDs (F, A, P, R)
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'F',
    'First',
    'First Class',
    1,
    true
FROM public.airline_codes ac
WHERE ac.iata_code IN ('AF', 'CA', 'CZ', 'EK', 'EY', 'LH', 'LX', 'NH', 'SQ', 'TG', 'AI', 'BG', 'MF', '3U', 'AS', 'AA', 'SV', 'KU', 'WY', 'PR', 'QH', 'QF', 'QR', 'KE', 'GF', 'MH', 'JL', 'OZ', 'ET', 'LY', 'EG', 'MS', 'HU')
ON CONFLICT DO NOTHING;

INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'A',
    'First',
    'First Class Advance Purchase',
    2,
    true
FROM public.airline_codes ac
WHERE ac.iata_code IN ('AF', 'CA', 'CZ', 'EK', 'EY', 'LH', 'LX', 'NH', 'SQ', 'TG', 'AI', 'BG', 'MF', '3U', 'AS', 'AA', 'SV', 'KU', 'WY', 'PR', 'QF', 'QR', 'KE', 'GF', 'MH', 'JL', 'OZ', 'ET', 'LY', 'EG', 'MS', 'HU', 'BA', 'BR')
ON CONFLICT DO NOTHING;

-- Business Class RBDs (J, C, D, Z, I, X, U, R)
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'J',
    'Business',
    'Business Class',
    1,
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN ('AQ', 'G9', 'BX', 'IX', 'I5', 'PA', 'G4', 'F8', 'F3', 'FS', 'XY', '5F', 'FA', 'G8', 'G3', 'UO', 'VE', 'U2', 'FN', 'ZE', '6E', '4O', 'JQ', '3K', 'RY', 'LJ', 'KY', 'MN', 'GJ', '8L', 'JE', 'DD', 'MM', 'PC', 'BK', 'H2', 'BC', '6J', 'SG', 'NK', '9C', 'SJ', '7G', 'SY', 'XQ', 'WG', 'WO', 'VJ', 'VB', 'VH', 'Y4', 'V7', 'VY', 'PN', 'W6', 'EU', 'FU', 'GX', 'GY', 'KN', 'OQ', 'QG', 'UQ', 'FR', 'TO', 'HV')
AND ac.iata_code NOT LIKE 'B0' -- La Compagnie is all-business but uses different codes
ON CONFLICT DO NOTHING;

INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'C',
    'Business',
    'Business Class Full Fare',
    2,
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN ('AQ', 'G9', 'BX', 'IX', 'I5', 'PA', 'G4', 'F8', 'F3', 'FS', 'XY', '5F', 'FA', 'G8', 'G3', 'UO', 'VE', 'U2', 'FN', 'ZE', '6E', '4O', 'JQ', '3K', 'RY', 'LJ', 'KY', 'MN', 'GJ', '8L', 'JE', 'DD', 'MM', 'PC', 'BK', 'H2', 'BC', '6J', 'SG', 'NK', '9C', 'SJ', '7G', 'SY', 'XQ', 'WG', 'WO', 'VJ', 'VB', 'VH', 'Y4', 'V7', 'VY', 'PN', 'W6', 'EU', 'FU', 'GX', 'GY', 'KN', 'OQ', 'QG', 'UQ', 'FR', 'TO', 'HV')
ON CONFLICT DO NOTHING;

INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'D',
    'Business',
    'Business Class Discounted',
    3,
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN ('AQ', 'G9', 'BX', 'IX', 'I5', 'PA', 'G4', 'F8', 'F3', 'FS', 'XY', '5F', 'FA', 'G8', 'G3', 'UO', 'VE', 'U2', 'FN', 'ZE', '6E', '4O', 'JQ', '3K', 'RY', 'LJ', 'KY', 'MN', 'GJ', '8L', 'JE', 'DD', 'MM', 'PC', 'BK', 'H2', 'BC', '6J', 'SG', 'NK', '9C', 'SJ', '7G', 'SY', 'XQ', 'WG', 'WO', 'VJ', 'VB', 'VH', 'Y4', 'V7', 'VY', 'PN', 'W6', 'EU', 'FU', 'GX', 'GY', 'KN', 'OQ', 'QG', 'UQ', 'FR', 'TO', 'HV')
ON CONFLICT DO NOTHING;

-- Premium Economy RBDs (W, S, T, P, A, G, E, N, R, O)
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'W',
    'Premium Economy',
    'Premium Economy',
    1,
    true
FROM public.airline_codes ac
WHERE ac.iata_code IN ('AC', 'AF', 'AY', 'BA', 'BR', 'CI', 'CZ', 'DE', 'IB', 'KL', 'KU', 'LY', 'MH', 'OS', 'PR', 'SN', 'UA', 'VS', 'VN', 'TX')
ON CONFLICT DO NOTHING;

-- Economy Class RBDs (Y, B, M, H, K, Q, L, V, N, O, T, E, U, G, S)
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'Y',
    'Economy',
    'Economy Full Fare',
    1,
    true
FROM public.airline_codes ac
ON CONFLICT DO NOTHING;

INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'B',
    'Economy',
    'Economy Full Fare Flexible',
    2,
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN ('AQ', 'G9', 'PA', 'F8', 'F3', 'FS', 'XY', '5F', 'FA', 'BF', 'F9', 'G8', 'G3', 'FN', 'ZE', 'VE', 'U2', '6E', '4O', 'JQ', '3K', 'RY', 'LJ', 'KY', 'MN', 'GJ', '8L', 'JE', 'DD', 'MM', 'PC', 'BK', 'H2', 'BC', '6J', 'SG', 'NK', '9C', 'SJ', '7G', 'SY', 'XQ', 'WG', 'WO', 'VJ', 'VB', 'VH', 'Y4', 'V7', 'VY', 'PN', 'W6', 'FR')
ON CONFLICT DO NOTHING;

INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'M',
    'Economy',
    'Economy Standard',
    3,
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN ('AQ', 'G9', 'PA', 'F8', 'F3', 'FS', 'XY', '5F', 'FA', 'BF', 'F9', 'G8', 'G3', 'FN', 'ZE', 'VE', 'U2', '6E', '4O', 'JQ', '3K', 'RY', 'LJ', 'KY', 'MN', 'GJ', '8L', 'JE', 'DD', 'MM', 'PC', 'BK', 'H2', 'BC', '6J', 'SG', 'NK', '9C', 'SJ', '7G', 'SY', 'XQ', 'WG', 'WO', 'VJ', 'VB', 'VH', 'Y4', 'V7', 'VY', 'PN', 'W6', 'FR')
ON CONFLICT DO NOTHING;

INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'H',
    'Economy',
    'Economy Advance Purchase',
    4,
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN ('AQ', 'G9', 'PA', 'F8', 'F3', 'FS', 'XY', '5F', 'FA', 'BF', 'F9', 'G8', 'G3', 'FN', 'ZE', 'VE', 'U2', '6E', '4O', 'JQ', '3K', 'RY', 'LJ', 'KY', 'MN', 'GJ', '8L', 'JE', 'DD', 'MM', 'PC', 'BK', 'H2', 'BC', '6J', 'SG', 'NK', '9C', 'SJ', '7G', 'SY', 'XQ', 'WG', 'WO', 'VJ', 'VB', 'VH', 'Y4', 'V7', 'VY', 'PN', 'W6', 'FR')
ON CONFLICT DO NOTHING;

INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'K',
    'Economy',
    'Economy Discounted',
    5,
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN ('AQ', 'G9', 'PA', 'F8', 'F3', 'FS', 'XY', '5F', 'FA', 'BF', 'F9', 'G8', 'G3', 'FN', 'ZE', 'VE', 'U2', '6E', '4O', 'JQ', '3K', 'RY', 'LJ', 'KY', 'MN', 'GJ', '8L', 'JE', 'DD', 'MM', 'PC', 'BK', 'H2', 'BC', '6J', 'SG', 'NK', '9C', 'SJ', '7G', 'SY', 'XQ', 'WG', 'WO', 'VJ', 'VB', 'VH', 'Y4', 'V7', 'VY', 'PN', 'W6', 'FR')
ON CONFLICT DO NOTHING;

INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'Q',
    'Economy',
    'Economy Restricted',
    6,
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN ('AQ', 'G9', 'PA', 'F8', 'F3', 'FS', 'XY', '5F', 'FA', 'BF', 'F9', 'G8', 'G3', 'FN', 'ZE', 'VE', 'U2', '6E', '4O', 'JQ', '3K', 'RY', 'LJ', 'KY', 'MN', 'GJ', '8L', 'JE', 'DD', 'MM', 'PC', 'BK', 'H2', 'BC', '6J', 'SG', 'NK', '9C', 'SJ', '7G', 'SY', 'XQ', 'WG', 'WO', 'VJ', 'VB', 'VH', 'Y4', 'V7', 'VY', 'PN', 'W6', 'FR')
ON CONFLICT DO NOTHING;

INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'L',
    'Economy',
    'Economy Super Saver',
    7,
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN ('AQ', 'G9', 'PA', 'F8', 'F3', 'FS', 'XY', '5F', 'FA', 'BF', 'F9', 'G8', 'G3', 'FN', 'ZE', 'VE', 'U2', '6E', '4O', 'JQ', '3K', 'RY', 'LJ', 'KY', 'MN', 'GJ', '8L', 'JE', 'DD', 'MM', 'PC', 'BK', 'H2', 'BC', '6J', 'SG', 'NK', '9C', 'SJ', '7G', 'SY', 'XQ', 'WG', 'WO', 'VJ', 'VB', 'VH', 'Y4', 'V7', 'VY', 'PN', 'W6', 'FR')
ON CONFLICT DO NOTHING;

-- Create specialized RBD templates for different airline types
INSERT INTO public.airline_rbd_templates (template_name, airline_type, template_data, is_default) VALUES
('Ultra Low Cost Carrier', 'low_cost', 
 '[{"code": "Y", "service_class": "Economy", "description": "Single Class Economy", "priority": 1}]', 
 false),
('All Business Airline', 'business_only', 
 '[{"code": "J", "service_class": "Business", "description": "Business Class", "priority": 1}, 
   {"code": "C", "service_class": "Business", "description": "Business Full Fare", "priority": 2}]', 
 false),
('Full Service Premium Carrier', 'full_service', 
 '[{"code": "F", "service_class": "First", "description": "First Class", "priority": 1},
   {"code": "A", "service_class": "First", "description": "First Advance Purchase", "priority": 2},
   {"code": "J", "service_class": "Business", "description": "Business Class", "priority": 1},
   {"code": "C", "service_class": "Business", "description": "Business Full Fare", "priority": 2},
   {"code": "D", "service_class": "Business", "description": "Business Discounted", "priority": 3},
   {"code": "W", "service_class": "Premium Economy", "description": "Premium Economy", "priority": 1},
   {"code": "Y", "service_class": "Economy", "description": "Economy Full Fare", "priority": 1},
   {"code": "B", "service_class": "Economy", "description": "Economy Flexible", "priority": 2},
   {"code": "M", "service_class": "Economy", "description": "Economy Standard", "priority": 3},
   {"code": "H", "service_class": "Economy", "description": "Economy Advance Purchase", "priority": 4},
   {"code": "K", "service_class": "Economy", "description": "Economy Discounted", "priority": 5},
   {"code": "Q", "service_class": "Economy", "description": "Economy Restricted", "priority": 6},
   {"code": "L", "service_class": "Economy", "description": "Economy Super Saver", "priority": 7}]', 
 false)
ON CONFLICT (template_name) DO NOTHING;

-- Add special RBD codes for specific airlines with unique configurations
-- Emirates extensive economy fare codes
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    unnest(ARRAY['V', 'W', 'T', 'X', 'G', 'E', 'R', 'S']),
    'Economy',
    'Economy Special Fares',
    unnest(ARRAY[8, 9, 10, 11, 12, 13, 14, 15]),
    true
FROM public.airline_codes ac
WHERE ac.iata_code = 'EK'
ON CONFLICT DO NOTHING;

-- Add basic economy codes for US carriers
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'N',
    'Economy',
    'Basic Economy',
    10,
    true
FROM public.airline_codes ac
WHERE ac.iata_code IN ('AA', 'DL', 'UA')
ON CONFLICT DO NOTHING;