-- Phase 1: Comprehensive Data Seeding with Interconnected Business Data

-- First, let's get existing user IDs to work with
DO $$
DECLARE
    sales_agent_id uuid;
    cs_agent_id uuid;
    manager_id uuid;
    client1_id uuid;
    client2_id uuid;
    client3_id uuid;
    request1_id uuid;
    request2_id uuid;
    request3_id uuid;
    quote1_id uuid;
    quote2_id uuid;
    quote3_id uuid;
BEGIN
    -- Get existing users from user_roles
    SELECT user_id INTO sales_agent_id FROM user_roles WHERE role = 'agent' LIMIT 1;
    SELECT user_id INTO cs_agent_id FROM user_roles WHERE role = 'agent' OFFSET 1 LIMIT 1;
    SELECT user_id INTO manager_id FROM user_roles WHERE role = 'manager' LIMIT 1;
    
    -- If no users exist, create some sample ones
    IF sales_agent_id IS NULL THEN
        sales_agent_id := gen_random_uuid();
        INSERT INTO profiles (id, first_name, last_name, email, company) 
        VALUES (sales_agent_id, 'John', 'Sales', 'john.sales@company.com', 'Select Business Class');
        INSERT INTO user_roles (user_id, role) VALUES (sales_agent_id, 'agent');
    END IF;
    
    IF cs_agent_id IS NULL THEN
        cs_agent_id := gen_random_uuid();
        INSERT INTO profiles (id, first_name, last_name, email, company) 
        VALUES (cs_agent_id, 'Sarah', 'Support', 'sarah.support@company.com', 'Select Business Class');
        INSERT INTO user_roles (user_id, role) VALUES (cs_agent_id, 'agent');
    END IF;
    
    IF manager_id IS NULL THEN
        manager_id := gen_random_uuid();
        INSERT INTO profiles (id, first_name, last_name, email, company) 
        VALUES (manager_id, 'Mike', 'Manager', 'mike.manager@company.com', 'Select Business Class');
        INSERT INTO user_roles (user_id, role) VALUES (manager_id, 'manager');
    END IF;

    -- Create sample clients
    INSERT INTO clients (id, user_id, first_name, last_name, email, phone, company, preferred_class, total_bookings, total_spent, last_trip_date, client_type)
    VALUES 
        (gen_random_uuid(), sales_agent_id, 'Robert', 'Johnson', 'robert.johnson@acme.com', '+1-555-0101', 'Acme Corp', 'business', 3, 15000.00, '2024-07-15', 'return'),
        (gen_random_uuid(), sales_agent_id, 'Emily', 'Davis', 'emily.davis@tech.com', '+1-555-0102', 'TechCorp', 'first', 1, 8500.00, '2024-06-20', 'return'),
        (gen_random_uuid(), cs_agent_id, 'Michael', 'Brown', 'michael.brown@startup.io', '+1-555-0103', 'Startup Inc', 'business', 0, 0, NULL, 'new')
    RETURNING id INTO client1_id;
    
    -- Get the client IDs we just created
    SELECT id INTO client1_id FROM clients WHERE email = 'robert.johnson@acme.com';
    SELECT id INTO client2_id FROM clients WHERE email = 'emily.davis@tech.com';
    SELECT id INTO client3_id FROM clients WHERE email = 'michael.brown@startup.io';

    -- Create sample requests
    INSERT INTO requests (id, user_id, client_id, origin, destination, departure_date, return_date, passengers, budget, travel_class, status, priority, assignment_status, assigned_to, created_at)
    VALUES 
        (gen_random_uuid(), sales_agent_id, client1_id, 'JFK', 'LHR', '2024-09-15', '2024-09-22', 2, 12000.00, 'business', 'quoted', 'high', 'assigned', sales_agent_id, NOW() - INTERVAL '5 days'),
        (gen_random_uuid(), sales_agent_id, client2_id, 'LAX', 'NRT', '2024-10-01', '2024-10-10', 1, 8000.00, 'first', 'confirmed', 'medium', 'assigned', sales_agent_id, NOW() - INTERVAL '3 days'),
        (gen_random_uuid(), cs_agent_id, client3_id, 'ORD', 'FRA', '2024-09-25', '2024-10-02', 1, 5000.00, 'business', 'pending', 'medium', 'available', NULL, NOW() - INTERVAL '1 day')
    RETURNING id INTO request1_id;
    
    -- Get the request IDs
    SELECT id INTO request1_id FROM requests WHERE origin = 'JFK' AND destination = 'LHR';
    SELECT id INTO request2_id FROM requests WHERE origin = 'LAX' AND destination = 'NRT';
    SELECT id INTO request3_id FROM requests WHERE origin = 'ORD' AND destination = 'FRA';

    -- Create sample quotes
    INSERT INTO quotes (id, user_id, request_id, client_id, route, fare_type, segments, total_segments, net_price, markup, total_price, adults_count, children_count, infants_count, status, valid_until, created_at)
    VALUES 
        (gen_random_uuid(), sales_agent_id, request1_id, client1_id, 'JFK-LHR', 'refundable', '[{"flight": "BA178", "departure": "2024-09-15T20:00:00Z", "arrival": "2024-09-16T07:30:00Z", "class": "C"}]'::jsonb, 1, 5800.00, 1200.00, 7000.00, 2, 0, 0, 'confirmed', '2024-09-01', NOW() - INTERVAL '4 days'),
        (gen_random_uuid(), sales_agent_id, request2_id, client2_id, 'LAX-NRT', 'refundable', '[{"flight": "NH005", "departure": "2024-10-01T11:50:00Z", "arrival": "2024-10-02T15:05:00Z", "class": "F"}]'::jsonb, 1, 7200.00, 800.00, 8000.00, 1, 0, 0, 'confirmed', '2024-09-15', NOW() - INTERVAL '2 days'),
        (gen_random_uuid(), cs_agent_id, request3_id, client3_id, 'ORD-FRA', 'flexible', '[{"flight": "LH434", "departure": "2024-09-25T17:15:00Z", "arrival": "2024-09-26T09:50:00Z", "class": "C"}]'::jsonb, 1, 4200.00, 800.00, 5000.00, 1, 0, 0, 'pending', '2024-09-20', NOW() - INTERVAL '1 day')
    RETURNING id INTO quote1_id;
    
    -- Get quote IDs
    SELECT id INTO quote1_id FROM quotes WHERE route = 'JFK-LHR';
    SELECT id INTO quote2_id FROM quotes WHERE route = 'LAX-NRT';
    SELECT id INTO quote3_id FROM quotes WHERE route = 'ORD-FRA';

    -- Create sample bookings (the missing piece!)
    INSERT INTO bookings (id, user_id, client_id, request_id, quote_id, booking_reference, pnr, airline_confirmation, total_price, commission_amount, booking_date, travel_date, status, passengers, route, created_at)
    VALUES 
        (gen_random_uuid(), sales_agent_id, client1_id, request1_id, quote1_id, 'SBC001234', '6RFTGY', 'BA123456', 7000.00, 1200.00, NOW() - INTERVAL '4 days', '2024-09-15', 'confirmed', 2, 'JFK-LHR', NOW() - INTERVAL '4 days'),
        (gen_random_uuid(), sales_agent_id, client2_id, request2_id, quote2_id, 'SBC001235', '7HGFDS', 'NH789012', 8000.00, 800.00, NOW() - INTERVAL '2 days', '2024-10-01', 'confirmed', 1, 'LAX-NRT', NOW() - INTERVAL '2 days');

    -- Create booking commissions
    INSERT INTO booking_commissions (booking_id, agent_id, commission_percentage, commission_amount, payment_status, created_at)
    SELECT b.id, b.user_id, 15.0, b.commission_amount, 'paid', b.created_at
    FROM bookings b;

    -- Create agent performance metrics
    INSERT INTO agent_performance_metrics (agent_id, metric_date, calls_made, emails_sent, response_time_avg, conversion_rate, satisfaction_score, revenue_generated, commission_earned, target_achieved, created_at)
    VALUES 
        (sales_agent_id, CURRENT_DATE - 1, 12, 25, '02:30:00'::interval, 0.85, 4.7, 15000.00, 2000.00, true, NOW() - INTERVAL '1 day'),
        (sales_agent_id, CURRENT_DATE - 2, 8, 18, '01:45:00'::interval, 0.75, 4.5, 8000.00, 800.00, true, NOW() - INTERVAL '2 days'),
        (cs_agent_id, CURRENT_DATE - 1, 15, 30, '01:15:00'::interval, 0.60, 4.2, 0, 0, false, NOW() - INTERVAL '1 day'),
        (cs_agent_id, CURRENT_DATE - 2, 20, 35, '00:45:00'::interval, 0.65, 4.3, 0, 0, false, NOW() - INTERVAL '2 days');

    -- Create communication logs
    INSERT INTO communication_logs (agent_id, client_id, communication_type, duration_minutes, response_time_minutes, satisfaction_rating, outcome, notes, created_at)
    VALUES 
        (sales_agent_id, client1_id, 'email', 0, 30, 5, 'booking_confirmed', 'Client confirmed business class booking to London', NOW() - INTERVAL '4 days'),
        (sales_agent_id, client1_id, 'phone', 15, 0, 5, 'booking_confirmed', 'Discussed travel details and confirmed preferences', NOW() - INTERVAL '4 days'),
        (sales_agent_id, client2_id, 'email', 0, 45, 4, 'booking_confirmed', 'First class booking to Tokyo confirmed', NOW() - INTERVAL '2 days'),
        (cs_agent_id, client3_id, 'email', 0, 60, NULL, 'follow_up_needed', 'Initial inquiry for Frankfurt trip', NOW() - INTERVAL '1 day');

    -- Create client satisfaction scores
    INSERT INTO client_satisfaction_scores (client_id, agent_id, rating, interaction_type, feedback_text, created_at)
    VALUES 
        (client1_id, sales_agent_id, 5, 'booking', 'Excellent service and very professional', NOW() - INTERVAL '3 days'),
        (client2_id, sales_agent_id, 4, 'booking', 'Good service, booking process was smooth', NOW() - INTERVAL '1 day');

    RAISE NOTICE 'Sample data created successfully with interconnected relationships';
END $$;