-- Phase 2: Add RBD assignments systematically
-- Add just the basic RBDs first

-- Add Economy Y class for specific major airlines first
DO $$
DECLARE
    airline_rec RECORD;
BEGIN
    -- Add Y class for all airlines
    FOR airline_rec IN SELECT id, iata_code FROM public.airline_codes LOOP
        INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
        VALUES (airline_rec.id, 'Y', 'Economy', 'Economy Full Fare', 1, true)
        ON CONFLICT (airline_id, booking_class_code) DO NOTHING;
    END LOOP;
    
    -- Add Business J class for full-service carriers
    FOR airline_rec IN SELECT id, iata_code FROM public.airline_codes 
    WHERE iata_code NOT IN ('AQ', 'G9', 'BX', 'IX', 'I5', 'PA', 'G4', 'F9', 'AK', 'U2', '5J', '6E', 'JQ', 'FR', 'NK', 'SG', '9C', 'VJ', 'W6', 'Y4', 'WN', 'PG') LOOP
        INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
        VALUES (airline_rec.id, 'J', 'Business', 'Business Class', 1, true)
        ON CONFLICT (airline_id, booking_class_code) DO NOTHING;
    END LOOP;
    
    -- Add Business C class  
    FOR airline_rec IN SELECT id, iata_code FROM public.airline_codes 
    WHERE iata_code NOT IN ('AQ', 'G9', 'BX', 'IX', 'I5', 'PA', 'G4', 'F9', 'AK', 'U2', '5J', '6E', 'JQ', 'FR', 'NK', 'SG', '9C', 'VJ', 'W6', 'Y4', 'WN', 'PG') LOOP
        INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
        VALUES (airline_rec.id, 'C', 'Business', 'Business Class Full Fare', 2, true)
        ON CONFLICT (airline_id, booking_class_code) DO NOTHING;
    END LOOP;
    
    -- Add First F class for premium carriers
    FOR airline_rec IN SELECT id, iata_code FROM public.airline_codes 
    WHERE iata_code IN ('AF', 'CA', 'CZ', 'EK', 'EY', 'LH', 'LX', 'NH', 'SQ', 'TG', 'AI', 'BG', 'MF', '3U', 'AS', 'AA', 'SV', 'KU', 'WY', 'PR', 'QH', 'QF', 'QR', 'KE', 'GF', 'MH', 'JL', 'OZ', 'LY', 'MS', 'HU', 'BA', 'BR') LOOP
        INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
        VALUES (airline_rec.id, 'F', 'First', 'First Class', 1, true)
        ON CONFLICT (airline_id, booking_class_code) DO NOTHING;
    END LOOP;
    
    -- Add common economy classes
    FOR airline_rec IN SELECT id, iata_code FROM public.airline_codes 
    WHERE iata_code NOT IN ('AQ', 'G9', 'PA', 'G4', 'F9', 'AK', 'I5', 'U2', '5J', '6E', 'JQ', 'FR', 'NK', 'SG', '9C', 'VJ', 'W6', 'Y4') LOOP
        INSERT INTO public.airline_rbd_assignments (airline_id, booking_class_code, service_class, class_description, booking_priority, is_active)
        VALUES 
            (airline_rec.id, 'B', 'Economy', 'Economy Flexible', 2, true),
            (airline_rec.id, 'M', 'Economy', 'Economy Standard', 3, true),
            (airline_rec.id, 'H', 'Economy', 'Economy Advance Purchase', 4, true),
            (airline_rec.id, 'K', 'Economy', 'Economy Discounted', 5, true),
            (airline_rec.id, 'Q', 'Economy', 'Economy Restricted', 6, true),
            (airline_rec.id, 'L', 'Economy', 'Economy Super Saver', 7, true)
        ON CONFLICT (airline_id, booking_class_code) DO NOTHING;
    END LOOP;
    
END $$;