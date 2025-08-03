-- Enhanced airline data with comprehensive IATA/ICAO codes
INSERT INTO public.airline_codes (iata_code, icao_code, name, country, alliance, logo_url) VALUES
-- Major US Airlines
('AA', 'AAL', 'American Airlines', 'United States', 'Oneworld', 'https://logos.world/aa-american-airlines-logo'),
('UA', 'UAL', 'United Airlines', 'United States', 'Star Alliance', 'https://logos.world/united-airlines-logo'),
('DL', 'DAL', 'Delta Air Lines', 'United States', 'SkyTeam', 'https://logos.world/delta-air-lines-logo'),
('WN', 'SWA', 'Southwest Airlines', 'United States', NULL, 'https://logos.world/southwest-airlines-logo'),
('B6', 'JBU', 'JetBlue Airways', 'United States', NULL, 'https://logos.world/jetblue-airways-logo'),
('AS', 'ASA', 'Alaska Airlines', 'United States', 'Oneworld', 'https://logos.world/alaska-airlines-logo'),
('F9', 'FFT', 'Frontier Airlines', 'United States', NULL, 'https://logos.world/frontier-airlines-logo'),
('NK', 'NKS', 'Spirit Airlines', 'United States', NULL, 'https://logos.world/spirit-airlines-logo'),

-- European Airlines
('LH', 'DLH', 'Lufthansa', 'Germany', 'Star Alliance', 'https://logos.world/lufthansa-logo'),
('BA', 'BAW', 'British Airways', 'United Kingdom', 'Oneworld', 'https://logos.world/british-airways-logo'),
('AF', 'AFR', 'Air France', 'France', 'SkyTeam', 'https://logos.world/air-france-logo'),
('KL', 'KLM', 'KLM Royal Dutch Airlines', 'Netherlands', 'SkyTeam', 'https://logos.world/klm-logo'),
('LX', 'SWR', 'Swiss International Air Lines', 'Switzerland', 'Star Alliance', 'https://logos.world/swiss-logo'),
('OS', 'AUA', 'Austrian Airlines', 'Austria', 'Star Alliance', 'https://logos.world/austrian-airlines-logo'),
('SN', 'BEL', 'Brussels Airlines', 'Belgium', 'Star Alliance', 'https://logos.world/brussels-airlines-logo'),
('AZ', 'ITY', 'ITA Airways', 'Italy', 'SkyTeam', 'https://logos.world/ita-airways-logo'),
('IB', 'IBE', 'Iberia', 'Spain', 'Oneworld', 'https://logos.world/iberia-logo'),
('TP', 'TAP', 'TAP Air Portugal', 'Portugal', 'Star Alliance', 'https://logos.world/tap-air-portugal-logo'),
('SK', 'SAS', 'Scandinavian Airlines', 'Sweden', 'Star Alliance', 'https://logos.world/sas-logo'),
('AY', 'FIN', 'Finnair', 'Finland', 'Oneworld', 'https://logos.world/finnair-logo'),
('FR', 'RYR', 'Ryanair', 'Ireland', NULL, 'https://logos.world/ryanair-logo'),
('U2', 'EZY', 'easyJet', 'United Kingdom', NULL, 'https://logos.world/easyjet-logo'),

-- Asian Airlines
('SQ', 'SIA', 'Singapore Airlines', 'Singapore', 'Star Alliance', 'https://logos.world/singapore-airlines-logo'),
('CX', 'CPA', 'Cathay Pacific', 'Hong Kong', 'Oneworld', 'https://logos.world/cathay-pacific-logo'),
('JL', 'JAL', 'Japan Airlines', 'Japan', 'Oneworld', 'https://logos.world/japan-airlines-logo'),
('NH', 'ANA', 'All Nippon Airways', 'Japan', 'Star Alliance', 'https://logos.world/ana-logo'),
('TG', 'THA', 'Thai Airways', 'Thailand', 'Star Alliance', 'https://logos.world/thai-airways-logo'),
('MH', 'MAS', 'Malaysia Airlines', 'Malaysia', 'Oneworld', 'https://logos.world/malaysia-airlines-logo'),
('KE', 'KAL', 'Korean Air', 'South Korea', 'SkyTeam', 'https://logos.world/korean-air-logo'),
('OZ', 'AAR', 'Asiana Airlines', 'South Korea', 'Star Alliance', 'https://logos.world/asiana-airlines-logo'),
('AI', 'AIC', 'Air India', 'India', 'Star Alliance', 'https://logos.world/air-india-logo'),
('6E', 'IGO', 'IndiGo', 'India', NULL, 'https://logos.world/indigo-logo'),

-- Middle Eastern Airlines
('EK', 'UAE', 'Emirates', 'United Arab Emirates', NULL, 'https://logos.world/emirates-logo'),
('QR', 'QTR', 'Qatar Airways', 'Qatar', 'Oneworld', 'https://logos.world/qatar-airways-logo'),
('EY', 'ETD', 'Etihad Airways', 'United Arab Emirates', NULL, 'https://logos.world/etihad-airways-logo'),
('TK', 'THY', 'Turkish Airlines', 'Turkey', 'Star Alliance', 'https://logos.world/turkish-airlines-logo'),
('MS', 'MSR', 'EgyptAir', 'Egypt', 'Star Alliance', 'https://logos.world/egyptair-logo'),

-- Australian/Oceania Airlines
('QF', 'QFA', 'Qantas', 'Australia', 'Oneworld', 'https://logos.world/qantas-logo'),
('VA', 'VOZ', 'Virgin Australia', 'Australia', NULL, 'https://logos.world/virgin-australia-logo'),
('JQ', 'JST', 'Jetstar Airways', 'Australia', NULL, 'https://logos.world/jetstar-logo'),
('NZ', 'ANZ', 'Air New Zealand', 'New Zealand', 'Star Alliance', 'https://logos.world/air-new-zealand-logo'),

-- Canadian Airlines
('AC', 'ACA', 'Air Canada', 'Canada', 'Star Alliance', 'https://logos.world/air-canada-logo'),
('WS', 'WJA', 'WestJet', 'Canada', NULL, 'https://logos.world/westjet-logo'),

-- Latin American Airlines
('LA', 'LAN', 'LATAM Airlines', 'Chile', 'Oneworld', 'https://logos.world/latam-logo'),
('CM', 'CMP', 'Copa Airlines', 'Panama', 'Star Alliance', 'https://logos.world/copa-airlines-logo'),
('AM', 'AMX', 'Aeroméxico', 'Mexico', 'SkyTeam', 'https://logos.world/aeromexico-logo'),
('G3', 'GLO', 'Gol Linhas Aéreas', 'Brazil', NULL, 'https://logos.world/gol-logo'),

-- African Airlines
('SA', 'SAA', 'South African Airways', 'South Africa', 'Star Alliance', 'https://logos.world/south-african-airways-logo'),
('ET', 'ETH', 'Ethiopian Airlines', 'Ethiopia', 'Star Alliance', 'https://logos.world/ethiopian-airlines-logo'),
('AT', 'RAM', 'Royal Air Maroc', 'Morocco', 'Oneworld', 'https://logos.world/royal-air-maroc-logo'),

-- Low-Cost Carriers
('W6', 'WZZ', 'Wizz Air', 'Hungary', NULL, 'https://logos.world/wizz-air-logo'),
('VY', 'VLG', 'Vueling', 'Spain', NULL, 'https://logos.world/vueling-logo'),
('PC', 'PGT', 'Pegasus Airlines', 'Turkey', NULL, 'https://logos.world/pegasus-airlines-logo'),
('SB', 'ACI', 'aircalin', 'New Caledonia', NULL, NULL),
('FZ', 'FDB', 'flydubai', 'United Arab Emirates', NULL, 'https://logos.world/flydubai-logo');

-- Enhanced airport data with comprehensive IATA/ICAO codes and coordinates
INSERT INTO public.airport_codes (iata_code, icao_code, name, city, country, latitude, longitude, timezone) VALUES
-- Major US Airports
('JFK', 'KJFK', 'John F. Kennedy International Airport', 'New York', 'United States', 40.6413, -73.7781, 'America/New_York'),
('LAX', 'KLAX', 'Los Angeles International Airport', 'Los Angeles', 'United States', 33.9425, -118.4081, 'America/Los_Angeles'),
('ORD', 'KORD', 'O''Hare International Airport', 'Chicago', 'United States', 41.9742, -87.9073, 'America/Chicago'),
('ATL', 'KATL', 'Hartsfield-Jackson Atlanta International Airport', 'Atlanta', 'United States', 33.6407, -84.4277, 'America/New_York'),
('DFW', 'KDFW', 'Dallas/Fort Worth International Airport', 'Dallas', 'United States', 32.8998, -97.0403, 'America/Chicago'),
('DEN', 'KDEN', 'Denver International Airport', 'Denver', 'United States', 39.8561, -104.6737, 'America/Denver'),
('LAS', 'KLAS', 'McCarran International Airport', 'Las Vegas', 'United States', 36.0840, -115.1537, 'America/Los_Angeles'),
('PHX', 'KPHX', 'Phoenix Sky Harbor International Airport', 'Phoenix', 'United States', 33.4373, -112.0078, 'America/Phoenix'),
('MIA', 'KMIA', 'Miami International Airport', 'Miami', 'United States', 25.7959, -80.2870, 'America/New_York'),
('SEA', 'KSEA', 'Seattle-Tacoma International Airport', 'Seattle', 'United States', 47.4502, -122.3088, 'America/Los_Angeles'),
('SFO', 'KSFO', 'San Francisco International Airport', 'San Francisco', 'United States', 37.6213, -122.3790, 'America/Los_Angeles'),
('BOS', 'KBOS', 'Logan International Airport', 'Boston', 'United States', 42.3656, -71.0096, 'America/New_York'),
('LGA', 'KLGA', 'LaGuardia Airport', 'New York', 'United States', 40.7769, -73.8740, 'America/New_York'),
('EWR', 'KEWR', 'Newark Liberty International Airport', 'Newark', 'United States', 40.6895, -74.1745, 'America/New_York'),
('BWI', 'KBWI', 'Baltimore-Washington International Airport', 'Baltimore', 'United States', 39.1774, -76.6684, 'America/New_York'),

-- Major European Airports
('LHR', 'EGLL', 'Heathrow Airport', 'London', 'United Kingdom', 51.4700, -0.4543, 'Europe/London'),
('CDG', 'LFPG', 'Charles de Gaulle Airport', 'Paris', 'France', 49.0097, 2.5479, 'Europe/Paris'),
('FRA', 'EDDF', 'Frankfurt Airport', 'Frankfurt', 'Germany', 50.0379, 8.5622, 'Europe/Berlin'),
('AMS', 'EHAM', 'Amsterdam Airport Schiphol', 'Amsterdam', 'Netherlands', 52.3105, 4.7683, 'Europe/Amsterdam'),
('MAD', 'LEMD', 'Madrid-Barajas Airport', 'Madrid', 'Spain', 40.4839, -3.5680, 'Europe/Madrid'),
('FCO', 'LIRF', 'Leonardo da Vinci International Airport', 'Rome', 'Italy', 41.8003, 12.2389, 'Europe/Rome'),
('MUC', 'EDDM', 'Munich Airport', 'Munich', 'Germany', 48.3537, 11.7750, 'Europe/Berlin'),
('ZUR', 'LSZH', 'Zurich Airport', 'Zurich', 'Switzerland', 47.4647, 8.5492, 'Europe/Zurich'),
('VIE', 'LOWW', 'Vienna International Airport', 'Vienna', 'Austria', 48.1103, 16.5697, 'Europe/Vienna'),
('CPH', 'EKCH', 'Copenhagen Airport', 'Copenhagen', 'Denmark', 55.6181, 12.6561, 'Europe/Copenhagen'),
('ARN', 'ESSA', 'Stockholm Arlanda Airport', 'Stockholm', 'Sweden', 59.6519, 17.9186, 'Europe/Stockholm'),
('HEL', 'EFHK', 'Helsinki Airport', 'Helsinki', 'Finland', 60.3172, 24.9633, 'Europe/Helsinki'),
('DUB', 'EIDW', 'Dublin Airport', 'Dublin', 'Ireland', 53.4213, -6.2701, 'Europe/Dublin'),
('LGW', 'EGKK', 'Gatwick Airport', 'London', 'United Kingdom', 51.1537, -0.1821, 'Europe/London'),
('STN', 'EGSS', 'Stansted Airport', 'London', 'United Kingdom', 51.8860, 0.2389, 'Europe/London'),

-- Major Asian Airports
('NRT', 'RJAA', 'Narita International Airport', 'Tokyo', 'Japan', 35.7647, 140.3864, 'Asia/Tokyo'),
('HND', 'RJTT', 'Haneda Airport', 'Tokyo', 'Japan', 35.5494, 139.7798, 'Asia/Tokyo'),
('ICN', 'RKSI', 'Incheon International Airport', 'Seoul', 'South Korea', 37.4602, 126.4407, 'Asia/Seoul'),
('SIN', 'WSSS', 'Singapore Changi Airport', 'Singapore', 'Singapore', 1.3644, 103.9915, 'Asia/Singapore'),
('HKG', 'VHHH', 'Hong Kong International Airport', 'Hong Kong', 'Hong Kong', 22.3080, 113.9185, 'Asia/Hong_Kong'),
('BKK', 'VTBS', 'Suvarnabhumi Airport', 'Bangkok', 'Thailand', 13.6900, 100.7501, 'Asia/Bangkok'),
('KUL', 'WMKK', 'Kuala Lumpur International Airport', 'Kuala Lumpur', 'Malaysia', 2.7456, 101.7072, 'Asia/Kuala_Lumpur'),
('DEL', 'VIDP', 'Indira Gandhi International Airport', 'New Delhi', 'India', 28.5562, 77.1000, 'Asia/Kolkata'),
('BOM', 'VABB', 'Chhatrapati Shivaji International Airport', 'Mumbai', 'India', 19.0896, 72.8656, 'Asia/Kolkata'),
('PVG', 'ZSPD', 'Shanghai Pudong International Airport', 'Shanghai', 'China', 31.1443, 121.8083, 'Asia/Shanghai'),
('PEK', 'ZBAA', 'Beijing Capital International Airport', 'Beijing', 'China', 40.0799, 116.6031, 'Asia/Shanghai'),
('CAN', 'ZGGG', 'Guangzhou Baiyun International Airport', 'Guangzhou', 'China', 23.3924, 113.2988, 'Asia/Shanghai'),

-- Middle Eastern Airports
('DXB', 'OMDB', 'Dubai International Airport', 'Dubai', 'United Arab Emirates', 25.2532, 55.3657, 'Asia/Dubai'),
('DOH', 'OTHH', 'Hamad International Airport', 'Doha', 'Qatar', 25.2731, 51.6080, 'Asia/Qatar'),
('AUH', 'OMAA', 'Abu Dhabi International Airport', 'Abu Dhabi', 'United Arab Emirates', 24.4330, 54.6511, 'Asia/Dubai'),
('IST', 'LTFM', 'Istanbul Airport', 'Istanbul', 'Turkey', 41.2619, 28.7415, 'Europe/Istanbul'),
('CAI', 'HECA', 'Cairo International Airport', 'Cairo', 'Egypt', 30.1219, 31.4056, 'Africa/Cairo'),

-- Australian/Oceania Airports
('SYD', 'YSSY', 'Sydney Kingsford Smith Airport', 'Sydney', 'Australia', -33.9399, 151.1753, 'Australia/Sydney'),
('MEL', 'YMML', 'Melbourne Airport', 'Melbourne', 'Australia', -37.6690, 144.8410, 'Australia/Melbourne'),
('BNE', 'YBBN', 'Brisbane Airport', 'Brisbane', 'Australia', -27.3942, 153.1218, 'Australia/Brisbane'),
('PER', 'YPPH', 'Perth Airport', 'Perth', 'Australia', -31.9385, 115.9672, 'Australia/Perth'),
('AKL', 'NZAA', 'Auckland Airport', 'Auckland', 'New Zealand', -37.0082, 174.7850, 'Pacific/Auckland'),

-- Canadian Airports
('YYZ', 'CYYZ', 'Toronto Pearson International Airport', 'Toronto', 'Canada', 43.6777, -79.6248, 'America/Toronto'),
('YVR', 'CYVR', 'Vancouver International Airport', 'Vancouver', 'Canada', 49.1967, -123.1815, 'America/Vancouver'),
('YUL', 'CYUL', 'Montreal-Pierre Elliott Trudeau International Airport', 'Montreal', 'Canada', 45.4657, -73.7400, 'America/Toronto'),
('YYC', 'CYYC', 'Calgary International Airport', 'Calgary', 'Canada', 51.1315, -114.0131, 'America/Edmonton'),

-- Latin American Airports
('SCL', 'SCEL', 'Santiago International Airport', 'Santiago', 'Chile', -33.3930, -70.7869, 'America/Santiago'),
('PTY', 'MPTO', 'Tocumen International Airport', 'Panama City', 'Panama', 9.0714, -79.3834, 'America/Panama'),
('MEX', 'MMMX', 'Mexico City International Airport', 'Mexico City', 'Mexico', 19.4363, -99.0721, 'America/Mexico_City'),
('GRU', 'SBGR', 'São Paulo-Guarulhos International Airport', 'São Paulo', 'Brazil', -23.4356, -46.4731, 'America/Sao_Paulo'),

-- African Airports
('JNB', 'FAJS', 'O.R. Tambo International Airport', 'Johannesburg', 'South Africa', -26.1367, 28.2411, 'Africa/Johannesburg'),
('CPT', 'FACT', 'Cape Town International Airport', 'Cape Town', 'South Africa', -33.9697, 18.6021, 'Africa/Johannesburg'),
('ADD', 'HAAB', 'Addis Ababa Bole International Airport', 'Addis Ababa', 'Ethiopia', 8.9774, 38.7989, 'Africa/Addis_Ababa'),
('CMN', 'GMMN', 'Mohammed V International Airport', 'Casablanca', 'Morocco', 33.3675, -7.5898, 'Africa/Casablanca');

-- Standard booking classes for major service types
INSERT INTO public.booking_classes (booking_class_code, service_class, class_description, booking_priority, airline_id, active) VALUES
-- Economy Classes (Most common RBDs)
('Y', 'Economy', 'Full Fare Economy', 10, NULL, true),
('B', 'Economy', 'Economy Advance Purchase', 9, NULL, true),
('M', 'Economy', 'Economy Discounted', 8, NULL, true),
('H', 'Economy', 'Economy Special', 7, NULL, true),
('K', 'Economy', 'Economy Discounted', 6, NULL, true),
('L', 'Economy', 'Economy Advance Purchase', 5, NULL, true),
('V', 'Economy', 'Economy Restricted', 4, NULL, true),
('S', 'Economy', 'Economy Super Saver', 3, NULL, true),
('N', 'Economy', 'Economy Discounted', 2, NULL, true),
('Q', 'Economy', 'Economy Group/Restricted', 1, NULL, true),
('T', 'Economy', 'Economy Restricted', 1, NULL, true),

-- Premium Economy Classes
('W', 'Premium Economy', 'Premium Economy Full Fare', 10, NULL, true),
('E', 'Premium Economy', 'Premium Economy Discounted', 8, NULL, true),

-- Business Classes
('C', 'Business', 'Full Fare Business', 10, NULL, true),
('D', 'Business', 'Business Discounted', 9, NULL, true),
('I', 'Business', 'Business Advance Purchase', 8, NULL, true),
('J', 'Business', 'Business Premium', 7, NULL, true),
('Z', 'Business', 'Business Restricted', 6, NULL, true),

-- First Classes
('F', 'First', 'Full Fare First Class', 10, NULL, true),
('A', 'First', 'First Class Discounted', 8, NULL, true),
('P', 'First', 'First Class Premium', 9, NULL, true),

-- Special Classes
('G', 'Economy', 'Conditional/Group', 1, NULL, true),
('U', 'Economy', 'Shuttle/No Reservation Required', 1, NULL, true),
('R', 'Business', 'Business Supersaver', 5, NULL, true),
('O', 'Economy', 'Economy Basic', 1, NULL, true);