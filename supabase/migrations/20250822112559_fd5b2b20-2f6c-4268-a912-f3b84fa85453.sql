-- Fix the get_security_metrics function to use correct column name and add real data aggregation
DROP FUNCTION IF EXISTS public.get_security_metrics(interval);

CREATE OR REPLACE FUNCTION public.get_security_metrics(time_period interval DEFAULT '24 hours')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  metrics jsonb;
  threat_events integer;
  critical_events integer;
  xss_attempts integer;
  sql_injection_attempts integer;
  blocked_ips_count integer;
  threat_level text;
BEGIN
  -- Get threat events count
  SELECT COUNT(*) INTO threat_events
  FROM public.security_events
  WHERE timestamp >= now() - time_period
  AND severity IN ('medium', 'high', 'critical');
  
  -- Get critical events count
  SELECT COUNT(*) INTO critical_events
  FROM public.security_events
  WHERE timestamp >= now() - time_period
  AND severity = 'critical';
  
  -- Get XSS attempts
  SELECT COUNT(*) INTO xss_attempts
  FROM public.security_events
  WHERE timestamp >= now() - time_period
  AND event_type LIKE '%xss%' OR details->>'attack_type' = 'xss';
  
  -- Get SQL injection attempts
  SELECT COUNT(*) INTO sql_injection_attempts
  FROM public.security_events
  WHERE timestamp >= now() - time_period
  AND event_type LIKE '%sql%' OR details->>'attack_type' = 'sql_injection';
  
  -- Get blocked IPs count (fix column name)
  SELECT COUNT(*) INTO blocked_ips_count
  FROM public.blocked_ips
  WHERE expires_at > now();
  
  -- Determine threat level
  IF critical_events > 5 THEN
    threat_level := 'CRITICAL';
  ELSIF critical_events > 0 OR threat_events > 20 THEN
    threat_level := 'HIGH';
  ELSIF threat_events > 10 THEN
    threat_level := 'MEDIUM';
  ELSE
    threat_level := 'LOW';
  END IF;
  
  -- Build metrics object
  metrics := jsonb_build_object(
    'period_hours', EXTRACT(EPOCH FROM time_period) / 3600,
    'threat_events', threat_events,
    'critical_events', critical_events,
    'xss_attempts', xss_attempts,
    'sql_injection_attempts', sql_injection_attempts,
    'blocked_ips', blocked_ips_count,
    'threat_level', threat_level,
    'last_updated', now()
  );
  
  RETURN metrics;
END;
$$;

-- Create device_fingerprints table for real device tracking
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_hash text NOT NULL,
  device_type text NOT NULL,
  browser text NOT NULL,
  os text NOT NULL,
  screen_resolution text,
  timezone text,
  language text,
  trust_score integer DEFAULT 50,
  is_verified boolean DEFAULT false,
  risk_level text DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  last_seen timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, device_hash)
);

-- Enable RLS on device_fingerprints
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for device_fingerprints
CREATE POLICY "Users can manage their own device fingerprints"
ON public.device_fingerprints
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create user_behavior_analytics table
CREATE TABLE IF NOT EXISTS public.user_behavior_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  metric_name text NOT NULL,
  confidence_score numeric(5,2) DEFAULT 50.00,
  data_points integer DEFAULT 0,
  last_calculated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, metric_name)
);

-- Enable RLS on user_behavior_analytics
ALTER TABLE public.user_behavior_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_behavior_analytics
CREATE POLICY "Users can view their own behavior analytics"
ON public.user_behavior_analytics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage behavior analytics"
ON public.user_behavior_analytics
FOR ALL
USING (true)
WITH CHECK (true);

-- Create access_policies table
CREATE TABLE IF NOT EXISTS public.access_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  policy_type text NOT NULL,
  compliance_percentage numeric(5,2) DEFAULT 100.00,
  is_active boolean DEFAULT true,
  last_evaluated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  policy_config jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'compliant' CHECK (status IN ('compliant', 'non-compliant', 'warning'))
);

-- Enable RLS on access_policies (admin only)
ALTER TABLE public.access_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage access policies"
ON public.access_policies
FOR ALL
USING (has_admin_role())
WITH CHECK (has_admin_role());

CREATE POLICY "Users can view access policies"
ON public.access_policies
FOR SELECT
USING (is_business_user());

-- Insert default access policies
INSERT INTO public.access_policies (name, description, policy_type, compliance_percentage, status, policy_config)
VALUES 
  ('Device Authentication', 'Requires verified device certificates for access', 'device_auth', 95.00, 'compliant', '{"require_device_cert": true, "trust_threshold": 80}'::jsonb),
  ('Behavioral Analytics', 'Continuous monitoring of user behavior patterns', 'behavioral', 92.00, 'compliant', '{"anomaly_threshold": 85, "monitoring_enabled": true}'::jsonb),
  ('Geo-Location Verification', 'Validates user location against expected patterns', 'geo_location', 78.00, 'warning', '{"allowed_countries": ["US", "CA", "UK"], "strict_mode": false}'::jsonb),
  ('Time-Based Access Control', 'Restricts access based on business hours and patterns', 'time_based', 85.00, 'compliant', '{"business_hours": "09:00-17:00", "timezone": "UTC", "weekend_access": false}'::jsonb)
ON CONFLICT DO NOTHING;

-- Create function to generate device fingerprint
CREATE OR REPLACE FUNCTION public.generate_device_fingerprint(
  p_user_id uuid,
  p_device_type text,
  p_browser text,
  p_os text,
  p_screen_resolution text DEFAULT NULL,
  p_timezone text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  device_id uuid;
  device_hash text;
  trust_score integer;
BEGIN
  -- Generate device hash
  device_hash := encode(digest(p_device_type || p_browser || p_os || COALESCE(p_screen_resolution, '') || p_user_id::text, 'sha256'), 'hex');
  
  -- Calculate initial trust score based on device characteristics
  trust_score := 50;
  
  -- Increase trust for known good browsers
  IF p_browser LIKE '%Chrome%' OR p_browser LIKE '%Firefox%' OR p_browser LIKE '%Safari%' THEN
    trust_score := trust_score + 20;
  END IF;
  
  -- Increase trust for common OS
  IF p_os LIKE '%Windows%' OR p_os LIKE '%macOS%' OR p_os LIKE '%iOS%' OR p_os LIKE '%Android%' THEN
    trust_score := trust_score + 15;
  END IF;
  
  -- Insert or update device fingerprint
  INSERT INTO public.device_fingerprints (
    user_id, device_hash, device_type, browser, os, 
    screen_resolution, timezone, language, trust_score, metadata
  )
  VALUES (
    p_user_id, device_hash, p_device_type, p_browser, p_os,
    p_screen_resolution, p_timezone, p_language, LEAST(trust_score, 100), p_metadata
  )
  ON CONFLICT (user_id, device_hash)
  DO UPDATE SET
    last_seen = now(),
    updated_at = now(),
    trust_score = LEAST(device_fingerprints.trust_score + 5, 100), -- Increase trust over time
    metadata = p_metadata
  RETURNING id INTO device_id;
  
  RETURN device_id;
END;
$$;

-- Create function to update behavior analytics
CREATE OR REPLACE FUNCTION public.update_behavior_analytics(
  p_user_id uuid,
  p_metric_name text,
  p_confidence_score numeric,
  p_data_points integer DEFAULT 1,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_behavior_analytics (
    user_id, metric_name, confidence_score, data_points, metadata
  )
  VALUES (
    p_user_id, p_metric_name, p_confidence_score, p_data_points, p_metadata
  )
  ON CONFLICT (user_id, metric_name)
  DO UPDATE SET
    confidence_score = (user_behavior_analytics.confidence_score * 0.8) + (p_confidence_score * 0.2), -- Weighted average
    data_points = user_behavior_analytics.data_points + p_data_points,
    last_calculated = now(),
    updated_at = now(),
    metadata = p_metadata;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user_id ON public.device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_last_seen ON public.device_fingerprints(last_seen);
CREATE INDEX IF NOT EXISTS idx_behavior_analytics_user_id ON public.user_behavior_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_access_policies_active ON public.access_policies(is_active) WHERE is_active = true;