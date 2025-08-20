-- PHASE 3: Complete Security Isolation for Remaining Tables
-- Fix email_exchanges and bookings security vulnerabilities

-- EMAIL_EXCHANGES: Complete communication privacy isolation
CREATE POLICY "email_exchanges_absolute_isolation"
ON public.email_exchanges
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- BOOKINGS: Complete travel data isolation  
CREATE POLICY "bookings_absolute_isolation"
ON public.bookings
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Create comprehensive security monitoring function
CREATE OR REPLACE FUNCTION public.comprehensive_security_monitor()
RETURNS TRIGGER AS $$
BEGIN
  -- Monitor all access to sensitive data with detailed logging
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'data_access_monitored',
    CASE 
      WHEN auth.uid() IS NULL THEN 'critical'
      WHEN TG_OP = 'SELECT' THEN 'low'
      WHEN TG_OP IN ('INSERT', 'UPDATE') THEN 'medium'
      WHEN TG_OP = 'DELETE' THEN 'high'
      ELSE 'medium'
    END,
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'record_owner_id', COALESCE(NEW.user_id, OLD.user_id),
      'authenticated', auth.uid() IS NOT NULL,
      'is_owner_access', auth.uid() = COALESCE(NEW.user_id, OLD.user_id),
      'timestamp', now(),
      'security_level', 'maximum_isolation',
      'access_pattern', 
        CASE 
          WHEN auth.uid() = COALESCE(NEW.user_id, OLD.user_id) THEN 'owner_access'
          WHEN auth.uid() IS NULL THEN 'anonymous_blocked'
          ELSE 'unauthorized_blocked'
        END,
      'data_classification',
        CASE TG_TABLE_NAME
          WHEN 'clients' THEN 'pii_confidential'
          WHEN 'quotes' THEN 'financial_sensitive'
          WHEN 'email_exchanges' THEN 'communication_private'
          WHEN 'bookings' THEN 'travel_financial'
          ELSE 'general'
        END
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Apply comprehensive monitoring to all sensitive tables
DROP TRIGGER IF EXISTS comprehensive_clients_monitor ON public.clients;
CREATE TRIGGER comprehensive_clients_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.comprehensive_security_monitor();

DROP TRIGGER IF EXISTS comprehensive_quotes_monitor ON public.quotes;  
CREATE TRIGGER comprehensive_quotes_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.comprehensive_security_monitor();

DROP TRIGGER IF EXISTS comprehensive_emails_monitor ON public.email_exchanges;
CREATE TRIGGER comprehensive_emails_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.email_exchanges
  FOR EACH ROW EXECUTE FUNCTION public.comprehensive_security_monitor();

DROP TRIGGER IF EXISTS comprehensive_bookings_monitor ON public.bookings;
CREATE TRIGGER comprehensive_bookings_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.comprehensive_security_monitor();

-- Create security policy validation function
CREATE OR REPLACE FUNCTION public.validate_security_isolation()
RETURNS TABLE(
  table_name text,
  policy_count bigint,
  has_isolation boolean,
  security_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    COUNT(p.policyname) as policy_count,
    COUNT(p.policyname) = 1 as has_isolation,
    CASE 
      WHEN COUNT(p.policyname) = 1 THEN 'SECURE_ISOLATED'
      WHEN COUNT(p.policyname) = 0 THEN 'NO_POLICIES_CRITICAL'
      WHEN COUNT(p.policyname) > 1 THEN 'OVERLAPPING_POLICIES_RISK'
      ELSE 'UNKNOWN'
    END as security_status
  FROM information_schema.tables t
  LEFT JOIN pg_policies p ON p.tablename = t.table_name
  WHERE t.table_schema = 'public' 
    AND t.table_name IN ('clients', 'quotes', 'email_exchanges', 'bookings')
  GROUP BY t.table_name
  ORDER BY t.table_name;
END;
$$;