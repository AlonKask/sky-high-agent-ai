-- SECURITY FIX: Harden flight_price_tracking table access
-- Issue: Flight Price Data Could Be Stolen by Competitors

-- First, let's add comprehensive logging for any access to this sensitive table
CREATE OR REPLACE FUNCTION log_flight_price_access()
RETURNS TRIGGER AS $$
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
      'record_count', CASE WHEN TG_OP = 'SELECT' THEN 1 ELSE 0 END,
      'timestamp', now(),
      'authenticated', auth.uid() IS NOT NULL,
      'user_role_check', public.is_business_user()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for comprehensive logging
DROP TRIGGER IF EXISTS flight_price_access_logger ON public.flight_price_tracking;
CREATE TRIGGER flight_price_access_logger
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.flight_price_tracking
  FOR EACH STATEMENT
  EXECUTE FUNCTION log_flight_price_access();

-- Drop existing potentially vulnerable policies
DROP POLICY IF EXISTS "Business users can view flight price tracking" ON public.flight_price_tracking;
DROP POLICY IF EXISTS "Authenticated price data insert" ON public.flight_price_tracking;

-- Create new, more restrictive policies with explicit security checks
CREATE POLICY "SECURE_flight_price_select_business_only" 
ON public.flight_price_tracking 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND public.is_business_user()
  AND public.validate_session_security()
);

CREATE POLICY "SECURE_flight_price_insert_system_only" 
ON public.flight_price_tracking 
FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "SECURE_flight_price_insert_admin_only" 
ON public.flight_price_tracking 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND public.has_admin_role()
  AND public.validate_session_security()
);

-- Ensure UPDATE and DELETE are restricted to admins only
CREATE POLICY "SECURE_flight_price_update_admin_only" 
ON public.flight_price_tracking 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND public.has_admin_role()
  AND public.validate_session_security()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND public.has_admin_role()
  AND public.validate_session_security()
);

CREATE POLICY "SECURE_flight_price_delete_admin_only" 
ON public.flight_price_tracking 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND public.has_admin_role()
  AND public.validate_session_security()
);

-- Add additional security function for flight price access validation
CREATE OR REPLACE FUNCTION validate_flight_price_access()
RETURNS BOOLEAN AS $$
DECLARE
  user_role app_role;
  session_valid BOOLEAN;
BEGIN
  -- Deny if not authenticated
  IF auth.uid() IS NULL THEN
    PERFORM public.log_security_event(
      'unauthorized_flight_price_access',
      'critical',
      jsonb_build_object(
        'reason', 'anonymous_access_attempt',
        'timestamp', now()
      )
    );
    RETURN FALSE;
  END IF;
  
  -- Check session security
  session_valid := public.validate_session_security();
  IF NOT session_valid THEN
    PERFORM public.log_security_event(
      'invalid_session_flight_price_access',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'reason', 'invalid_session',
        'timestamp', now()
      )
    );
    RETURN FALSE;
  END IF;
  
  -- Check user role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  IF user_role NOT IN ('admin', 'manager', 'supervisor', 'gds_expert', 'agent') THEN
    PERFORM public.log_security_event(
      'unauthorized_role_flight_price_access',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'reason', 'insufficient_role',
        'timestamp', now()
      )
    );
    RETURN FALSE;
  END IF;
  
  -- Log successful authorized access
  PERFORM public.log_security_event(
    'authorized_flight_price_access',
    'low',
    jsonb_build_object(
      'user_id', auth.uid(),
      'user_role', user_role,
      'timestamp', now()
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add data classification to track sensitivity level
ALTER TABLE public.flight_price_tracking 
ADD COLUMN IF NOT EXISTS data_classification TEXT DEFAULT 'highly_confidential';

-- Create index for better performance on security checks
CREATE INDEX IF NOT EXISTS idx_flight_price_tracking_security 
ON public.flight_price_tracking (scraped_at, source) 
WHERE is_available = true;

-- Add comment to document security requirements
COMMENT ON TABLE public.flight_price_tracking IS 'HIGHLY SENSITIVE: Contains competitive pricing intelligence. Access restricted to authenticated business users only with session validation.';

-- Final security verification: Ensure RLS is enabled
ALTER TABLE public.flight_price_tracking ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner (additional security layer)
ALTER TABLE public.flight_price_tracking FORCE ROW LEVEL SECURITY;