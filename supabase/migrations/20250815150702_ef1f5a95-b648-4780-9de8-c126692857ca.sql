-- Create sample data with correct schema for bookings table
INSERT INTO public.bookings (
  id, user_id, client_id, request_id, total_price, 
  booking_reference, status, created_at, route
) 
SELECT 
  gen_random_uuid(),
  ur.user_id,
  c.id as client_id,
  gen_random_uuid() as request_id,
  (random() * 5000 + 1000)::numeric(10,2) as total_price,
  'SBC' || lpad((random() * 999999)::text, 6, '0') as booking_reference,
  CASE 
    WHEN random() < 0.8 THEN 'confirmed'
    WHEN random() < 0.95 THEN 'pending'
    ELSE 'cancelled'
  END as status,
  now() - (random() * interval '180 days') as created_at,
  (ARRAY['LAX-JFK', 'LHR-DXB', 'CDG-NRT', 'JFK-LAX', 'DXB-LHR', 'NRT-CDG'])[ceil(random() * 6)::int] as route
FROM public.user_roles ur
CROSS JOIN public.clients c
WHERE ur.role = 'user' 
AND c.user_id = ur.user_id
AND random() < 0.25 -- 25% chance for each client-agent combination
LIMIT 200;

-- Update client totals based on bookings
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

-- Add agent performance metrics
INSERT INTO public.agent_performance_metrics (
  agent_id, metric_date, calls_made, emails_sent, response_time_avg,
  conversion_rate, satisfaction_score, revenue_generated, commission_earned,
  target_achieved, created_at, updated_at
)
SELECT 
  ur.user_id as agent_id,
  date_series.metric_date,
  (random() * 12 + 3)::int as calls_made,
  (random() * 20 + 8)::int as emails_sent,
  (interval '1 hour' * (random() * 6 + 1)) as response_time_avg,
  (random() * 0.25 + 0.15)::numeric(5,2) as conversion_rate,
  (random() * 1.5 + 3.5)::numeric(3,2) as satisfaction_score,
  (random() * 12000 + 3000)::numeric(10,2) as revenue_generated,
  (random() * 1200 + 300)::numeric(10,2) as commission_earned,
  random() < 0.65 as target_achieved,
  now() as created_at,
  now() as updated_at
FROM public.user_roles ur
CROSS JOIN (
  SELECT generate_series(
    current_date - interval '90 days',
    current_date,
    interval '1 day'
  )::date AS metric_date
) date_series
WHERE ur.role = 'user'
AND random() < 0.6; -- 60% chance for each day

-- Add communication logs
INSERT INTO public.communication_logs (
  agent_id, client_id, communication_type, duration_minutes,
  response_time_minutes, satisfaction_rating, outcome, notes, created_at
)
SELECT 
  ur.user_id as agent_id,
  c.id as client_id,
  (ARRAY['email', 'phone', 'chat', 'video_call'])[ceil(random() * 4)::int] as communication_type,
  CASE 
    WHEN (ARRAY['email', 'phone', 'chat', 'video_call'])[ceil(random() * 4)::int] = 'phone' THEN (random() * 35 + 10)::int
    WHEN (ARRAY['email', 'phone', 'chat', 'video_call'])[ceil(random() * 4)::int] = 'video_call' THEN (random() * 50 + 15)::int
    ELSE (random() * 15 + 2)::int
  END as duration_minutes,
  (random() * 180 + 15)::int as response_time_minutes,
  (random() * 2 + 3)::int as satisfaction_rating,
  (ARRAY['quote_sent', 'booking_confirmed', 'follow_up_scheduled', 'no_interest', 'information_gathered'])[ceil(random() * 5)::int] as outcome,
  (ARRAY['Client interested in business class', 'Discussed travel preferences', 'Sent quote options', 'Requested price adjustments', 'Scheduled follow-up call'])[ceil(random() * 5)::int] as notes,
  now() - (random() * interval '90 days') as created_at
FROM public.user_roles ur
CROSS JOIN public.clients c
WHERE ur.role = 'user' 
AND c.user_id = ur.user_id
AND random() < 0.3; -- 30% chance for each client-agent combination

-- Add satisfaction scores
INSERT INTO public.client_satisfaction_scores (
  client_id, agent_id, rating, interaction_type, feedback_text, created_at
)
SELECT 
  c.id as client_id,
  c.user_id as agent_id,
  (random() * 2 + 3)::int as rating,
  (ARRAY['booking', 'consultation', 'support', 'follow_up'])[ceil(random() * 4)::int] as interaction_type,
  (ARRAY[
    'Excellent service, very professional',
    'Found great options within budget',
    'Quick responses and clear communication',
    'Helpful with all travel requirements',
    'Smooth booking process'
  ])[ceil(random() * 5)::int] as feedback_text,
  now() - (random() * interval '90 days') as created_at
FROM public.clients c
WHERE random() < 0.4; -- 40% chance for each client

-- Add booking commissions
INSERT INTO public.booking_commissions (
  booking_id, agent_id, client_id, base_commission, bonus_commission,
  total_commission, commission_rate, payout_status, payout_date
)
SELECT 
  b.id as booking_id,
  b.user_id as agent_id,
  b.client_id,
  (b.total_price * 0.08)::numeric(10,2) as base_commission,
  CASE WHEN random() < 0.25 THEN (random() * 150 + 50)::numeric(10,2) ELSE 0 END as bonus_commission,
  (b.total_price * 0.08 + CASE WHEN random() < 0.25 THEN (random() * 150 + 50) ELSE 0 END)::numeric(10,2) as total_commission,
  (random() * 3 + 7)::numeric(5,2) as commission_rate,
  CASE 
    WHEN random() < 0.75 THEN 'paid'
    WHEN random() < 0.9 THEN 'pending'
    ELSE 'processing'
  END as payout_status,
  CASE 
    WHEN random() < 0.75 THEN (now() - (random() * interval '60 days'))::date
    ELSE NULL
  END as payout_date
FROM public.bookings b
WHERE b.status = 'confirmed';