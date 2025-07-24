-- Create memory archivation and agent reporting tables
CREATE TABLE public.communication_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'sms', 'call', 'meeting')),
  content_summary TEXT NOT NULL,
  original_content JSONB,
  archived_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  original_date TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}',
  retention_expiry TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.agent_performance_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  supervisor_id UUID,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  total_clients INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  total_commission NUMERIC(12,2) DEFAULT 0,
  avg_response_time INTERVAL,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  client_satisfaction_score NUMERIC(3,2) DEFAULT 0,
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.client_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  preferred_routes JSONB DEFAULT '[]',
  historical_spending JSONB DEFAULT '{}',
  booking_patterns JSONB DEFAULT '{}',
  price_sensitivity TEXT CHECK (price_sensitivity IN ('low', 'medium', 'high')),
  profit_potential TEXT CHECK (profit_potential IN ('low', 'medium', 'high')),
  avg_ticket_price NUMERIC(10,2),
  seasonal_preferences JSONB DEFAULT '{}',
  upselling_opportunities JSONB DEFAULT '[]',
  risk_score INTEGER DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
  last_analysis TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);

CREATE TABLE public.flight_price_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route TEXT NOT NULL,
  origin_code TEXT NOT NULL,
  destination_code TEXT NOT NULL,
  travel_date DATE NOT NULL,
  class_type TEXT NOT NULL,
  airline TEXT,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  source TEXT NOT NULL CHECK (source IN ('kayak', 'skyscanner', 'google_flights', 'direct_airline')),
  booking_url TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_available BOOLEAN DEFAULT true
);

-- Enable RLS on all new tables
ALTER TABLE public.communication_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_price_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for communication_archive
CREATE POLICY "Users can view their own archived communications" 
ON public.communication_archive 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can archive their own communications" 
ON public.communication_archive 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for agent_performance_reports
CREATE POLICY "Agents can view their own reports" 
ON public.agent_performance_reports 
FOR SELECT 
USING (auth.uid() = agent_id);

CREATE POLICY "Supervisors can view all reports" 
ON public.agent_performance_reports 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = supervisor_id);

CREATE POLICY "Supervisors can create reports" 
ON public.agent_performance_reports 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = supervisor_id);

-- Create RLS policies for client_intelligence
CREATE POLICY "Users can view their own client intelligence" 
ON public.client_intelligence 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own client intelligence" 
ON public.client_intelligence 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for flight_price_tracking (public read access for pricing data)
CREATE POLICY "Anyone can view flight price data" 
ON public.flight_price_tracking 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert price data" 
ON public.flight_price_tracking 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_communication_archive_user_client ON public.communication_archive(user_id, client_id);
CREATE INDEX idx_communication_archive_date ON public.communication_archive(archived_date);
CREATE INDEX idx_agent_performance_period ON public.agent_performance_reports(agent_id, report_period_start, report_period_end);
CREATE INDEX idx_client_intelligence_user_client ON public.client_intelligence(user_id, client_id);
CREATE INDEX idx_flight_price_route_date ON public.flight_price_tracking(route, travel_date);
CREATE INDEX idx_flight_price_scraped ON public.flight_price_tracking(scraped_at);

-- Create trigger for automatic archivation
CREATE OR REPLACE FUNCTION archive_old_communications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Archive emails older than 90 days
  INSERT INTO public.communication_archive (
    user_id, client_id, communication_type, content_summary, 
    original_content, original_date, retention_expiry
  )
  SELECT 
    user_id, client_id, 'email', 
    LEFT(subject || ': ' || body, 500),
    jsonb_build_object(
      'subject', subject,
      'body', body,
      'sender_email', sender_email,
      'recipient_emails', recipient_emails
    ),
    created_at,
    now() + INTERVAL '7 years'
  FROM public.email_exchanges 
  WHERE created_at < now() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.communication_archive 
    WHERE communication_archive.user_id = email_exchanges.user_id 
    AND communication_archive.client_id = email_exchanges.client_id
    AND communication_archive.original_date = email_exchanges.created_at
  );
  
  -- Delete archived emails
  DELETE FROM public.email_exchanges 
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;