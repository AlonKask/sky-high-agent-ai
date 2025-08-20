-- Update existing requests to have proper assignment status and improve data visibility
-- This ensures requests are visible and properly categorized

-- First, update requests that don't have assignment_status set
UPDATE public.requests 
SET assignment_status = 'available'
WHERE assignment_status IS NULL;

-- Update client types to ensure proper categorization
UPDATE public.clients 
SET client_type = CASE 
  WHEN total_bookings > 0 THEN 'return'
  ELSE 'new'
END
WHERE client_type IS NULL OR client_type = '';

-- Add a few more sample requests for testing with proper data relationships
DO $$
DECLARE
  admin_user_id UUID := '7f169cd4-e5f9-4c4b-821f-55f60746fbac';
  manager_user_id UUID := 'd63058d8-da7c-414e-b92f-79ff050500ee';
  sample_client_id UUID;
BEGIN
  -- Create additional test requests for better visibility
  
  -- Get a client for the admin user
  SELECT id INTO sample_client_id 
  FROM public.clients 
  WHERE user_id = admin_user_id 
  LIMIT 1;
  
  IF sample_client_id IS NOT NULL THEN
    -- Add a few more requests for the admin user
    INSERT INTO public.requests (
      user_id, client_id, request_type, origin, destination, 
      departure_date, return_date, passengers, 
      class_preference, status, assignment_status, priority
    ) VALUES 
    (admin_user_id, sample_client_id, 'round_trip', 'LAX', 'NRT', 
     CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '21 days', 
     1, 'business', 'pending', 'available', 'high'),
    (admin_user_id, sample_client_id, 'one_way', 'JFK', 'LHR', 
     CURRENT_DATE + INTERVAL '7 days', NULL, 
     2, 'first', 'pending', 'available', 'medium');
  END IF;
  
  -- Get a client for the manager user  
  SELECT id INTO sample_client_id 
  FROM public.clients 
  WHERE user_id = manager_user_id 
  LIMIT 1;
  
  IF sample_client_id IS NOT NULL THEN
    -- Add requests for the manager user
    INSERT INTO public.requests (
      user_id, client_id, request_type, origin, destination,
      departure_date, return_date, passengers,
      class_preference, status, assignment_status, priority
    ) VALUES
    (manager_user_id, sample_client_id, 'round_trip', 'MIA', 'CDG',
     CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '17 days',
     1, 'business', 'pending', 'available', 'high');
  END IF;
END $$;