-- Phase 1: Database Architecture Enhancement
-- Create agent performance metrics table for real-time KPI tracking
CREATE TABLE public.agent_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  metric_date DATE DEFAULT CURRENT_DATE,
  calls_made INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  response_time_avg INTERVAL DEFAULT '0 minutes',
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
  revenue_generated DECIMAL(12,2) DEFAULT 0.00,
  commission_earned DECIMAL(12,2) DEFAULT 0.00,
  target_achieved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, metric_date)
);

-- Create communication logs table for call/response time tracking
CREATE TABLE public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  communication_type TEXT CHECK (communication_type IN ('call', 'email', 'chat', 'sms')) NOT NULL,
  duration_minutes INTEGER DEFAULT 0,
  response_time_minutes INTEGER DEFAULT 0,
  outcome TEXT CHECK (outcome IN ('successful', 'no_answer', 'callback_requested', 'completed', 'escalated')),
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client satisfaction scores table
CREATE TABLE public.client_satisfaction_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  agent_id UUID NOT NULL,
  interaction_type TEXT CHECK (interaction_type IN ('booking', 'support', 'inquiry', 'follow_up')) NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking commissions table for detailed commission tracking
CREATE TABLE public.booking_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  agent_id UUID NOT NULL,
  base_commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,
  bonus_amount DECIMAL(12,2) DEFAULT 0.00,
  total_commission DECIMAL(12,2) NOT NULL,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all new tables
ALTER TABLE public.agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_satisfaction_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_performance_metrics
CREATE POLICY "Agents can view their own metrics" 
ON public.agent_performance_metrics FOR SELECT 
USING (auth.uid() = agent_id);

CREATE POLICY "Managers can view all agent metrics" 
ON public.agent_performance_metrics FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage agent metrics" 
ON public.agent_performance_metrics FOR ALL 
USING (true);

-- RLS Policies for communication_logs
CREATE POLICY "Agents can view their own communication logs" 
ON public.communication_logs FOR SELECT 
USING (auth.uid() = agent_id);

CREATE POLICY "Managers can view all communication logs" 
ON public.communication_logs FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can create their own communication logs" 
ON public.communication_logs FOR INSERT 
WITH CHECK (auth.uid() = agent_id);

-- RLS Policies for client_satisfaction_scores
CREATE POLICY "Agents can view satisfaction scores for their clients" 
ON public.client_satisfaction_scores FOR SELECT 
USING (auth.uid() = agent_id OR can_access_client_data_secure((SELECT user_id FROM clients WHERE id = client_id)));

CREATE POLICY "System can create satisfaction scores" 
ON public.client_satisfaction_scores FOR INSERT 
WITH CHECK (true);

-- RLS Policies for booking_commissions
CREATE POLICY "Agents can view their own commissions" 
ON public.booking_commissions FOR SELECT 
USING (auth.uid() = agent_id);

CREATE POLICY "Managers can view all commissions" 
ON public.booking_commissions FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_agent_performance_metrics_agent_date ON public.agent_performance_metrics(agent_id, metric_date);
CREATE INDEX idx_communication_logs_agent_created ON public.communication_logs(agent_id, created_at);
CREATE INDEX idx_client_satisfaction_agent_created ON public.client_satisfaction_scores(agent_id, created_at);
CREATE INDEX idx_booking_commissions_agent_status ON public.booking_commissions(agent_id, payment_status);

-- Create function to update agent performance metrics
CREATE OR REPLACE FUNCTION public.update_agent_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update metrics when communication logs or bookings change
  INSERT INTO public.agent_performance_metrics (
    agent_id,
    metric_date,
    calls_made,
    emails_sent,
    response_time_avg,
    conversion_rate,
    satisfaction_score,
    revenue_generated,
    commission_earned
  )
  SELECT 
    NEW.agent_id,
    CURRENT_DATE,
    COUNT(CASE WHEN communication_type = 'call' THEN 1 END),
    COUNT(CASE WHEN communication_type = 'email' THEN 1 END),
    AVG(CASE WHEN response_time_minutes > 0 THEN make_interval(mins => response_time_minutes) END),
    COALESCE(
      (SELECT COUNT(*) FROM bookings b WHERE b.user_id = NEW.agent_id AND DATE(b.created_at) = CURRENT_DATE)::DECIMAL /
      NULLIF((SELECT COUNT(*) FROM requests r WHERE r.user_id = NEW.agent_id AND DATE(r.created_at) = CURRENT_DATE), 0) * 100,
      0
    ),
    COALESCE((SELECT AVG(rating) FROM client_satisfaction_scores css WHERE css.agent_id = NEW.agent_id AND DATE(css.created_at) = CURRENT_DATE), 0),
    COALESCE((SELECT SUM(total_price) FROM bookings b WHERE b.user_id = NEW.agent_id AND DATE(b.created_at) = CURRENT_DATE), 0),
    COALESCE((SELECT SUM(commission_amount) FROM booking_commissions bc WHERE bc.agent_id = NEW.agent_id AND DATE(bc.created_at) = CURRENT_DATE), 0)
  FROM communication_logs cl
  WHERE cl.agent_id = NEW.agent_id 
    AND DATE(cl.created_at) = CURRENT_DATE
  GROUP BY NEW.agent_id
  ON CONFLICT (agent_id, metric_date) 
  DO UPDATE SET
    calls_made = EXCLUDED.calls_made,
    emails_sent = EXCLUDED.emails_sent,
    response_time_avg = EXCLUDED.response_time_avg,
    conversion_rate = EXCLUDED.conversion_rate,
    satisfaction_score = EXCLUDED.satisfaction_score,
    revenue_generated = EXCLUDED.revenue_generated,
    commission_earned = EXCLUDED.commission_earned,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic metric updates
CREATE TRIGGER update_agent_metrics_trigger
  AFTER INSERT OR UPDATE ON public.communication_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agent_performance_metrics();

-- Create function to generate sample data for testing
CREATE OR REPLACE FUNCTION public.generate_sample_dashboard_data(p_agent_id UUID)
RETURNS VOID AS $$
DECLARE
  i INTEGER;
  random_client_id UUID;
  random_booking_id UUID;
BEGIN
  -- Generate sample communication logs for the last 30 days
  FOR i IN 1..50 LOOP
    SELECT id INTO random_client_id FROM clients WHERE user_id = p_agent_id ORDER BY RANDOM() LIMIT 1;
    
    IF random_client_id IS NOT NULL THEN
      INSERT INTO public.communication_logs (
        agent_id,
        client_id,
        communication_type,
        duration_minutes,
        response_time_minutes,
        outcome,
        satisfaction_rating,
        created_at
      ) VALUES (
        p_agent_id,
        random_client_id,
        (ARRAY['call', 'email', 'chat'])[floor(random() * 3 + 1)],
        floor(random() * 60 + 5)::INTEGER,
        floor(random() * 120 + 1)::INTEGER,
        (ARRAY['successful', 'no_answer', 'callback_requested', 'completed'])[floor(random() * 4 + 1)],
        floor(random() * 5 + 1)::INTEGER,
        NOW() - (random() * interval '30 days')
      );
    END IF;
  END LOOP;

  -- Generate sample satisfaction scores
  FOR i IN 1..20 LOOP
    SELECT id INTO random_client_id FROM clients WHERE user_id = p_agent_id ORDER BY RANDOM() LIMIT 1;
    
    IF random_client_id IS NOT NULL THEN
      INSERT INTO public.client_satisfaction_scores (
        client_id,
        agent_id,
        interaction_type,
        rating,
        feedback_text,
        created_at
      ) VALUES (
        random_client_id,
        p_agent_id,
        (ARRAY['booking', 'support', 'inquiry', 'follow_up'])[floor(random() * 4 + 1)],
        floor(random() * 5 + 1)::INTEGER,
        'Sample feedback for testing purposes',
        NOW() - (random() * interval '30 days')
      );
    END IF;
  END LOOP;

  -- Generate sample commission data for existing bookings
  FOR random_booking_id IN 
    SELECT id FROM bookings WHERE user_id = p_agent_id LIMIT 10
  LOOP
    INSERT INTO public.booking_commissions (
      booking_id,
      agent_id,
      base_commission_rate,
      commission_amount,
      bonus_amount,
      total_commission,
      payment_status,
      created_at
    ) VALUES (
      random_booking_id,
      p_agent_id,
      10.00,
      (random() * 500 + 100)::DECIMAL(12,2),
      (random() * 100)::DECIMAL(12,2),
      (random() * 600 + 100)::DECIMAL(12,2),
      (ARRAY['pending', 'paid'])[floor(random() * 2 + 1)],
      NOW() - (random() * interval '30 days')
    );
  END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;