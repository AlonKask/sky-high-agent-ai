-- Add missing security tables and functions (check for existing before creating)

-- Add rate limiting tracking table for edge functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL, -- IP address or user ID
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate_limits if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rate_limits' 
    AND policyname = 'System can manage rate limits'
  ) THEN
    ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "System can manage rate limits" ON public.rate_limits FOR ALL USING (true);
  END IF;
END $$;

-- Create index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint 
ON public.rate_limits (identifier, endpoint, window_start);

-- Add password policy validation function
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

-- Add CSP violation reporting table
CREATE TABLE IF NOT EXISTS public.csp_violations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  violation_data jsonb NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on csp_violations if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'csp_violations' 
    AND policyname = 'System can log CSP violations'
  ) THEN
    ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "System can log CSP violations" ON public.csp_violations FOR INSERT WITH CHECK (true);
    CREATE POLICY "Admins can view CSP violations" ON public.csp_violations FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;