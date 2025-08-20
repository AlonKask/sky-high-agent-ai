-- Fix security warning: Function Search Path Mutable
-- Update the log_flight_price_access function to have a fixed search_path

CREATE OR REPLACE FUNCTION log_flight_price_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all access to flight price data for security monitoring
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    auth.uid(),
    'flight_price_data_accessed',
    CASE 
      WHEN auth.uid() IS NULL THEN 'critical'
      WHEN TG_OP = 'SELECT' THEN 'medium'
      ELSE 'high'
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'table', 'flight_price_tracking',
      'timestamp', now(),
      'authenticated', auth.uid() IS NOT NULL,
      'user_role_check', public.is_business_user()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;