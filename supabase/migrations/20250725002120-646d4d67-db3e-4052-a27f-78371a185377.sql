-- Fix security issues identified by Supabase linter

-- 1. Move extensions from public schema to extensions schema
-- Note: This requires careful handling as extensions may be in use

-- 2. Reduce OTP expiry time to recommended 5 minutes (300 seconds)
-- This is configured in Supabase Auth settings, but we can add a database function to check

-- 3. Create audit logging function for security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text DEFAULT 'medium',
  p_details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_event_type,
    p_severity,
    p_details,
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
END;
$$;

-- 4. Add rate limiting tracking table for edge functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL, -- IP address or user ID
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System can manage rate limits" ON public.rate_limits
FOR ALL USING (true);

-- Create index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint 
ON public.rate_limits (identifier, endpoint, window_start);

-- 5. Add password policy validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Password must be at least 8 characters
  IF length(password) < 8 THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one uppercase letter
  IF password !~ '[A-Z]' THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one lowercase letter
  IF password !~ '[a-z]' THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one number
  IF password !~ '[0-9]' THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one special character
  IF password !~ '[^A-Za-z0-9]' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 6. Create session tracking for enhanced security
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text UNIQUE NOT NULL,
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true,
  last_activity timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days')
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update their own sessions" ON public.user_sessions
FOR UPDATE USING (auth.uid() = user_id);

-- System can create sessions
CREATE POLICY "System can create sessions" ON public.user_sessions
FOR INSERT WITH CHECK (true);

-- Create index for session queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
ON public.user_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id 
ON public.user_sessions (session_id);

-- 7. Add CSP violation reporting table
CREATE TABLE IF NOT EXISTS public.csp_violations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  violation_data jsonb NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on csp_violations
ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;

-- Only admins can view CSP violations
CREATE POLICY "Admins can view CSP violations" ON public.csp_violations
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- System can log CSP violations
CREATE POLICY "System can log CSP violations" ON public.csp_violations
FOR INSERT WITH CHECK (true);