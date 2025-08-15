-- Create sample data with correct constraint values
-- Insert bookings with correct schema
INSERT INTO public.bookings (
  user_id, client_id, request_id, total_price, 
  booking_reference, status, created_at, route
) 
SELECT 
  ur.user_id,
  c.id as client_id,
  gen_random_uuid() as request_id,
  (random() * 4000 + 1500)::numeric(10,2) as total_price,
  'SBC' || lpad((random() * 999999)::text, 6, '0') as booking_reference,
  CASE 
    WHEN random() < 0.75 THEN 'confirmed'
    WHEN random() < 0.9 THEN 'pending'
    ELSE 'cancelled'
  END as status,
  now() - (random() * interval '120 days') as created_at,
  (ARRAY['LAX-JFK', 'LHR-DXB', 'CDG-NRT', 'JFK-LAX', 'DXB-LHR', 'NRT-CDG'])[ceil(random() * 6)::int] as route
FROM public.user_roles ur
CROSS JOIN public.clients c
WHERE ur.role = 'user' 
AND c.user_id = ur.user_id
AND random() < 0.25 -- 25% chance
LIMIT 200;

-- Update client totals
UPDATE public.clients 
SET 
  total_spent = COALESCE(booking_totals.total_spent, 0),
  total_bookings = COALESCE(booking_totals.booking_count, 0),
  last_trip_date = booking_totals.last_booking_date
FROM (
  SELECT 
    client_id,
    SUM(total_price) as total_spent,
    COUNT(*) as booking_count,
    MAX(created_at::date) as last_booking_date
  FROM public.bookings 
  WHERE status = 'confirmed'
  GROUP BY client_id
) booking_totals
WHERE clients.id = booking_totals.client_id;

-- Create agent performance metrics
INSERT INTO public.agent_performance_metrics (
  agent_id, metric_date, calls_made, emails_sent, response_time_avg,
  conversion_rate, satisfaction_score, revenue_generated, commission_earned,
  target_achieved
)
SELECT 
  ur.user_id as agent_id,
  date_series.metric_date,
  (random() * 10 + 5)::int as calls_made,
  (random() * 15 + 10)::int as emails_sent,
  (interval '1 hour' * (random() * 4 + 2)) as response_time_avg,
  (random() * 0.2 + 0.2)::numeric(5,2) as conversion_rate,
  (random() * 1.0 + 4.0)::numeric(3,2) as satisfaction_score,
  (random() * 8000 + 4000)::numeric(10,2) as revenue_generated,
  (random() * 800 + 400)::numeric(10,2) as commission_earned,
  random() < 0.7 as target_achieved
FROM public.user_roles ur
CROSS JOIN (
  SELECT generate_series(
    current_date - interval '90 days',
    current_date,
    interval '3 days'
  )::date AS metric_date
) date_series
WHERE ur.role = 'user'
AND random() < 0.8
ON CONFLICT (agent_id, metric_date) DO NOTHING;

-- Create communication logs
INSERT INTO public.communication_logs (
  agent_id, client_id, communication_type, duration_minutes,
  response_time_minutes, satisfaction_rating, outcome, notes
)
SELECT 
  ur.user_id as agent_id,
  c.id as client_id,
  (ARRAY['email', 'phone', 'chat'])[ceil(random() * 3)::int] as communication_type,
  (random() * 30 + 10)::int as duration_minutes,
  (random() * 120 + 30)::int as response_time_minutes,
  (random() * 2 + 3)::int as satisfaction_rating,
  (ARRAY['quote_sent', 'booking_confirmed', 'follow_up_scheduled', 'information_gathered'])[ceil(random() * 4)::int] as outcome,
  'Client communication regarding travel requirements' as notes
FROM public.user_roles ur
CROSS JOIN public.clients c
WHERE ur.role = 'user' 
AND c.user_id = ur.user_id
AND random() < 0.3
LIMIT 400;

-- Create client satisfaction scores with correct interaction types
INSERT INTO public.client_satisfaction_scores (
  client_id, agent_id, rating, interaction_type, feedback_text
)
SELECT 
  c.id as client_id,
  c.user_id as agent_id,
  (random() * 2 + 3)::int as rating,
  'booking' as interaction_type, -- Use a valid interaction type
  (ARRAY[
    'Excellent service and communication',
    'Found great travel options',
    'Professional and helpful agent',
    'Smooth booking experience',
    'Quick response to all questions'
  ])[ceil(random() * 5)::int] as feedback_text
FROM public.clients c
WHERE random() < 0.4
LIMIT 150;

-- Create booking commissions
INSERT INTO public.booking_commissions (
  booking_id, agent_id, client_id, base_commission, bonus_commission,
  total_commission, commission_rate, payout_status, payout_date
)
SELECT 
  b.id as booking_id,
  b.user_id as agent_id,
  b.client_id,
  (b.total_price * 0.1)::numeric(10,2) as base_commission,
  CASE WHEN random() < 0.2 THEN (random() * 100 + 50)::numeric(10,2) ELSE 0 END as bonus_commission,
  (b.total_price * 0.1 + CASE WHEN random() < 0.2 THEN (random() * 100 + 50) ELSE 0 END)::numeric(10,2) as total_commission,
  10.0 as commission_rate,
  CASE 
    WHEN random() < 0.8 THEN 'paid'
    ELSE 'pending'
  END as payout_status,
  CASE 
    WHEN random() < 0.8 THEN (now() - (random() * interval '60 days'))::date
    ELSE NULL
  END as payout_date
FROM public.bookings b
WHERE b.status = 'confirmed'
AND NOT EXISTS (
  SELECT 1 FROM public.booking_commissions bc 
  WHERE bc.booking_id = b.id
);

-- Create sample requests
INSERT INTO public.requests (
  user_id, client_id, departure_city, arrival_city, 
  departure_date, return_date, adults, children, infants,
  preferred_class, status, notes
)
SELECT 
  ur.user_id,
  c.id as client_id,
  'New York' as departure_city,
  'London' as arrival_city,
  (current_date + (random() * 60)::int) as departure_date,
  (current_date + (random() * 60 + 14)::int) as return_date,
  2 as adults,
  0 as children,
  0 as infants,
  'business' as preferred_class,
  CASE 
    WHEN random() < 0.4 THEN 'completed'
    WHEN random() < 0.7 THEN 'quoted'
    ELSE 'new'
  END as status,
  'Business class travel request'
FROM public.user_roles ur
CROSS JOIN public.clients c
WHERE ur.role = 'user' 
AND c.user_id = ur.user_id
AND random() < 0.4
LIMIT 250;