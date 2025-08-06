-- Phase 2: Add RBD assignments for all airlines using proper conflict resolution
-- Use the unique constraint (airline_id, booking_class_code) for ON CONFLICT

-- Add Economy Y booking class for ALL airlines
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'Y',
    'Economy',
    'Economy Full Fare',
    1,
    true
FROM public.airline_codes ac
ON CONFLICT (airline_id, booking_class_code) DO NOTHING;

-- Add Business class J for airlines that offer business class
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'J',
    'Business',
    'Business Class',
    1,
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN (
    'AQ', 'G9', 'BX', 'IX', 'I5', 'PA', 'G4', 'F9', 'AK', 'U2', '5J', '6E', 'JQ', 'FR', 'NK', 'SG', '9C', 'VJ', 'W6', 'Y4', 'WN', 'PG'
)
ON CONFLICT (airline_id, booking_class_code) DO NOTHING;

-- Add Business class C
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'C',
    'Business',
    'Business Class Full Fare',
    2,
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN (
    'AQ', 'G9', 'BX', 'IX', 'I5', 'PA', 'G4', 'F9', 'AK', 'U2', '5J', '6E', 'JQ', 'FR', 'NK', 'SG', '9C', 'VJ', 'W6', 'Y4', 'WN', 'PG'
)
ON CONFLICT (airline_id, booking_class_code) DO NOTHING;

-- Add Business class D
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'D',
    'Business',
    'Business Class Discounted',
    3,
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN (
    'AQ', 'G9', 'BX', 'IX', 'I5', 'PA', 'G4', 'F9', 'AK', 'U2', '5J', '6E', 'JQ', 'FR', 'NK', 'SG', '9C', 'VJ', 'W6', 'Y4', 'WN', 'PG'
)
ON CONFLICT (airline_id, booking_class_code) DO NOTHING;

-- Add First class F for premium carriers
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'F',
    'First',
    'First Class',
    1,
    true
FROM public.airline_codes ac
WHERE ac.iata_code IN (
    'AF', 'CA', 'CZ', 'EK', 'EY', 'LH', 'LX', 'NH', 'SQ', 'TG', 'AI', 'BG', 'MF', '3U', 'AS', 'AA', 'SV', 'KU', 'WY', 'PR', 'QH', 'QF', 'QR', 'KE', 'GF', 'MH', 'JL', 'OZ', 'LY', 'MS', 'HU', 'BA', 'BR'
)
ON CONFLICT (airline_id, booking_class_code) DO NOTHING;

-- Add First class A
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'A',
    'First',
    'First Class Advance Purchase',
    2,
    true
FROM public.airline_codes ac
WHERE ac.iata_code IN (
    'AF', 'CA', 'CZ', 'EK', 'EY', 'LH', 'LX', 'NH', 'SQ', 'TG', 'AI', 'BG', 'MF', '3U', 'AS', 'AA', 'SV', 'KU', 'WY', 'PR', 'QF', 'QR', 'KE', 'GF', 'MH', 'JL', 'OZ', 'LY', 'MS', 'HU', 'BA', 'BR'
)
ON CONFLICT (airline_id, booking_class_code) DO NOTHING;

-- Add Premium Economy W
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    'W',
    'Premium Economy',
    'Premium Economy',
    1,
    true
FROM public.airline_codes ac
WHERE ac.iata_code IN (
    'AC', 'AF', 'AY', 'BA', 'BR', 'CI', 'CZ', 'DE', 'IB', 'KL', 'KU', 'LY', 'MH', 'OS', 'PR', 'SN', 'UA', 'VS', 'VN', 'TX', 'LH', 'LX'
)
ON CONFLICT (airline_id, booking_class_code) DO NOTHING;

-- Add common economy fare classes for full-service carriers
INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
SELECT 
    ac.id,
    unnest(ARRAY['B', 'M', 'H', 'K', 'Q', 'L', 'V']),
    'Economy',
    unnest(ARRAY['Economy Flexible', 'Economy Standard', 'Economy Advance Purchase', 'Economy Discounted', 'Economy Restricted', 'Economy Super Saver', 'Economy Value']),
    unnest(ARRAY[2, 3, 4, 5, 6, 7, 8]),
    true
FROM public.airline_codes ac
WHERE ac.iata_code NOT IN (
    'AQ', 'G9', 'PA', 'G4', 'F9', 'AK', 'I5', 'U2', '5J', '6E', 'JQ', 'FR', 'NK', 'SG', '9C', 'VJ', 'W6', 'Y4'
)
ON CONFLICT (airline_id, booking_class_code) DO NOTHING;

-- Add Basic Economy N for US carriers
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
ON CONFLICT (airline_id, booking_class_code) DO NOTHING;

-- Create specialized RBD templates
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