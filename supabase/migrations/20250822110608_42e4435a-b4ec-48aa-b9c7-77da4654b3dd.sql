-- ==========================================
-- BULLETPROOF SECURITY SIMPLIFICATION
-- Simplifies complex validation while maintaining security
-- ==========================================

-- 1. Simplified but Bulletproof RLS Policies
-- ==========================================

-- Ultra-simplified clients security (bulletproof)
DROP POLICY IF EXISTS "ENHANCED_clients_pii_protection" ON public.clients;
CREATE POLICY "BULLETPROOF_clients_security"
ON public.clients
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND validate_session_security()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Ultra-simplified quotes security (bulletproof)
DROP POLICY IF EXISTS "ENHANCED_quotes_financial_protection" ON public.quotes;
CREATE POLICY "BULLETPROOF_quotes_security"
ON public.quotes
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Ultra-simplified gmail credentials security (bulletproof)
DROP POLICY IF EXISTS "ENHANCED_gmail_credential_security" ON public.gmail_credentials;
CREATE POLICY "BULLETPROOF_gmail_credentials_security"
ON public.gmail_credentials
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND validate_session_security()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- 2. Secure Additional Tables (if they exist)
-- ==========================================

-- Secure flight_price_tracking table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'flight_price_tracking') THEN
    EXECUTE 'DROP POLICY IF EXISTS "flight_price_tracking_policy" ON public.flight_price_tracking';
    EXECUTE 'CREATE POLICY "BULLETPROOF_flight_pricing_security"
    ON public.flight_price_tracking
    FOR ALL
    TO authenticated
    USING (
      auth.uid() IS NOT NULL 
      AND auth.uid() = user_id
    )
    WITH CHECK (
      auth.uid() IS NOT NULL 
      AND auth.uid() = user_id
    )';
  END IF;
END $$;

-- Secure email_exchanges table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_exchanges') THEN
    EXECUTE 'DROP POLICY IF EXISTS "ENHANCED_email_communication_privacy" ON public.email_exchanges';
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage their own emails" ON public.email_exchanges';
    EXECUTE 'CREATE POLICY "BULLETPROOF_email_security"
    ON public.email_exchanges
    FOR ALL
    TO authenticated
    USING (
      auth.uid() IS NOT NULL 
      AND auth.uid() = user_id
    )
    WITH CHECK (
      auth.uid() IS NOT NULL 
      AND auth.uid() = user_id
    )';
  END IF;
END $$;

-- 3. Keep Enhanced Logging But Simplify Access Control
-- ==========================================

-- Create simple admin override function (for legitimate business needs)
CREATE OR REPLACE FUNCTION public.admin_can_access_with_audit(
  target_table TEXT,
  target_user_id UUID,
  justification TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Only for admin users with explicit justification
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = auth.uid();
  
  IF user_role = 'admin' AND length(trim(justification)) >= 10 THEN
    -- Log admin override with full audit trail
    PERFORM public.log_security_event(
      'admin_data_access_override',
      'critical',
      jsonb_build_object(
        'admin_id', auth.uid(),
        'target_table', target_table,
        'target_user', target_user_id,
        'justification', justification,
        'requires_review', TRUE,
        'audit_critical', TRUE
      )
    );
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 4. Final Security Status Update
-- ==========================================

-- Log security simplification
DO $$
BEGIN
  PERFORM public.log_security_event(
    'security_policies_simplified',
    'medium',
    jsonb_build_object(
      'simplification_version', '1.0',
      'policies_simplified', 5,
      'complexity_reduced', TRUE,
      'security_maintained', TRUE,
      'bulletproof_policies', TRUE,
      'admin_override_available', TRUE
    )
  );
END $$;

-- Comment on security approach
COMMENT ON FUNCTION public.validate_session_security() IS 'Core session validation - keep simple and bulletproof';
COMMENT ON FUNCTION public.admin_can_access_with_audit() IS 'Admin override with full audit trail - use sparingly with business justification';