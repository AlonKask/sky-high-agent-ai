-- Create comprehensive data seeding for agent performance metrics
-- Insert realistic performance data for the last 6 months for existing users

-- First, let's create some sample booking data with commissions
INSERT INTO public.bookings (
  id, user_id, client_id, request_id, total_price, commission_amount, 
  booking_reference, status, created_at, route, segments
) 
SELECT 
  gen_random_uuid(),
  ur.user_id,
  c.id as client_id,
  gen_random_uuid() as request_id,
  (random() * 5000 + 1000)::numeric(10,2) as total_price,
  (random() * 500 + 100)::numeric(10,2) as commission_amount,
  'SBC' || lpad((random() * 999999)::text, 6, '0') as booking_reference,
  CASE 
    WHEN random() < 0.8 THEN 'confirmed'
    WHEN random() < 0.95 THEN 'pending'
    ELSE 'cancelled'
  END as status,
  now() - (random() * interval '180 days') as created_at,
  ARRAY['LAX', 'LHR', 'CDG'][ceil(random() * 3)::int] || '-' || ARRAY['JFK', 'DXB', 'NRT'][ceil(random() * 3)::int] as route,
  jsonb_build_array(
    jsonb_build_object(
      'departure', ARRAY['LAX', 'LHR', 'CDG'][ceil(random() * 3)::int],
      'arrival', ARRAY['JFK', 'DXB', 'NRT'][ceil(random() * 3)::int],
      'airline', ARRAY['AA', 'BA', 'AF'][ceil(random() * 3)::int],
      'flight_number', ARRAY['AA', 'BA', 'AF'][ceil(random() * 3)::int] || (100 + random() * 900)::int,
      'class', ARRAY['business', 'first', 'premium_economy'][ceil(random() * 3)::int]
    )
  ) as segments
FROM public.user_roles ur
CROSS JOIN public.clients c
WHERE ur.role = 'user' 
AND c.user_id = ur.user_id
AND random() < 0.3 -- 30% chance for each client-agent combination
LIMIT 500;

-- Create agent performance metrics for the last 6 months
INSERT INTO public.agent_performance_metrics (
  agent_id, metric_date, calls_made, emails_sent, response_time_avg,
  conversion_rate, satisfaction_score, revenue_generated, commission_earned,
  target_achieved, created_at, updated_at
)
SELECT 
  ur.user_id as agent_id,
  date_series.metric_date,
  (random() * 15 + 5)::int as calls_made,
  (random() * 25 + 10)::int as emails_sent,
  (interval '1 hour' * (random() * 8 + 2)) as response_time_avg,
  (random() * 0.3 + 0.1)::numeric(5,2) as conversion_rate,
  (random() * 2 + 3.5)::numeric(3,2) as satisfaction_score,
  (random() * 15000 + 5000)::numeric(10,2) as revenue_generated,
  (random() * 1500 + 500)::numeric(10,2) as commission_earned,
  random() < 0.7 as target_achieved,
  now() as created_at,
  now() as updated_at
FROM public.user_roles ur
CROSS JOIN (
  SELECT generate_series(
    current_date - interval '180 days',
    current_date,
    interval '1 day'
  )::date AS metric_date
) date_series
WHERE ur.role = 'user'
AND random() < 0.8; -- 80% chance for each day

-- Create communication logs with realistic interaction data
INSERT INTO public.communication_logs (
  agent_id, client_id, communication_type, duration_minutes,
  response_time_minutes, satisfaction_rating, outcome, notes, created_at
)
SELECT 
  ur.user_id as agent_id,
  c.id as client_id,
  ARRAY['email', 'phone', 'chat', 'video_call'][ceil(random() * 4)::int] as communication_type,
  CASE 
    WHEN ARRAY['email', 'phone', 'chat', 'video_call'][ceil(random() * 4)::int] = 'phone' THEN (random() * 45 + 5)::int
    WHEN ARRAY['email', 'phone', 'chat', 'video_call'][ceil(random() * 4)::int] = 'video_call' THEN (random() * 60 + 15)::int
    ELSE (random() * 20 + 2)::int
  END as duration_minutes,
  (random() * 240 + 10)::int as response_time_minutes,
  (random() * 2 + 3)::int as satisfaction_rating,
  ARRAY['quote_sent', 'booking_confirmed', 'follow_up_scheduled', 'no_interest', 'information_gathered'][ceil(random() * 5)::int] as outcome,
  ARRAY['Client interested in business class options', 'Discussed travel dates and preferences', 'Sent multiple quote options', 'Client requested price adjustments', 'Follow-up scheduled for next week'][ceil(random() * 5)::int] as notes,
  now() - (random() * interval '180 days') as created_at
FROM public.user_roles ur
CROSS JOIN public.clients c
WHERE ur.role = 'user' 
AND c.user_id = ur.user_id
AND random() < 0.4; -- 40% chance for each client-agent combination

-- Create client satisfaction scores
INSERT INTO public.client_satisfaction_scores (
  client_id, agent_id, rating, interaction_type, feedback_text, created_at
)
SELECT 
  c.id as client_id,
  c.user_id as agent_id,
  (random() * 2 + 3)::int as rating,
  ARRAY['booking', 'consultation', 'support', 'follow_up'][ceil(random() * 4)::int] as interaction_type,
  ARRAY[
    'Great service, very professional and responsive',
    'Found excellent options within my budget',
    'Quick response time and good communication',
    'Helpful with travel requirements and documentation',
    'Satisfied with the booking process'
  ][ceil(random() * 5)::int] as feedback_text,
  now() - (random() * interval '180 days') as created_at
FROM public.clients c
WHERE random() < 0.6; -- 60% chance for each client

-- Create booking commissions table
CREATE TABLE IF NOT EXISTS public.booking_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  client_id UUID NOT NULL,
  base_commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonus_commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  payout_status TEXT NOT NULL DEFAULT 'pending',
  payout_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on booking_commissions
ALTER TABLE public.booking_commissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for booking_commissions
CREATE POLICY "Agents can view their own commissions"
ON public.booking_commissions FOR SELECT
USING (auth.uid() = agent_id);

CREATE POLICY "Managers can view all commissions"
ON public.booking_commissions FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage commissions"
ON public.booking_commissions FOR ALL
USING (true);

-- Populate booking commissions based on existing bookings
INSERT INTO public.booking_commissions (
  booking_id, agent_id, client_id, base_commission, bonus_commission,
  total_commission, commission_rate, payout_status, payout_date
)
SELECT 
  b.id as booking_id,
  b.user_id as agent_id,
  b.client_id,
  b.commission_amount as base_commission,
  CASE WHEN random() < 0.3 THEN (random() * 200 + 50)::numeric(10,2) ELSE 0 END as bonus_commission,
  b.commission_amount + CASE WHEN random() < 0.3 THEN (random() * 200 + 50)::numeric(10,2) ELSE 0 END as total_commission,
  (random() * 5 + 8)::numeric(5,2) as commission_rate,
  CASE 
    WHEN random() < 0.7 THEN 'paid'
    WHEN random() < 0.9 THEN 'pending'
    ELSE 'processing'
  END as payout_status,
  CASE 
    WHEN random() < 0.7 THEN (now() - (random() * interval '60 days'))::date
    ELSE NULL
  END as payout_date
FROM public.bookings b
WHERE b.status = 'confirmed';

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_date ON public.agent_performance_metrics(agent_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_communication_logs_agent_created ON public.communication_logs(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_satisfaction_agent_created ON public.client_satisfaction_scores(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_commissions_agent_created ON public.booking_commissions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_created ON public.bookings(user_id, status, created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_booking_commissions_updated_at
  BEFORE UPDATE ON public.booking_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_performance_metrics_updated_at
  BEFORE UPDATE ON public.agent_performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();