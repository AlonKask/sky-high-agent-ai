-- ==========================================
-- BULLETPROOF SECURITY SIMPLIFICATION (FIXED)
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

-- 2. Secure Additional Tables Based on Their Actual Structure
-- ==========================================

-- Secure email_exchanges table (if exists and has user_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_exchanges' AND table_schema = 'public') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_exchanges' AND column_name = 'user_id' AND table_schema = 'public') THEN
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
  END IF;
END $$;

-- Secure flight_price_tracking table only if it has proper user column
DO $$
DECLARE
  user_column_name TEXT;
BEGIN
  -- Check if flight_price_tracking table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'flight_price_tracking' AND table_schema = 'public') THEN
    -- Find the user column (could be user_id, agent_id, created_by, etc.)
    SELECT column_name INTO user_column_name
    FROM information_schema.columns 
    WHERE table_name = 'flight_price_tracking' 
      AND table_schema = 'public'
      AND column_name IN ('user_id', 'agent_id', 'created_by', 'owner_id')
    LIMIT 1;
    
    -- Only create policy if we found a user column
    IF user_column_name IS NOT NULL THEN
      EXECUTE 'DROP POLICY IF EXISTS "flight_price_tracking_policy" ON public.flight_price_tracking';
      EXECUTE format('CREATE POLICY "BULLETPROOF_flight_pricing_security"
      ON public.flight_price_tracking
      FOR ALL
      TO authenticated
      USING (
        auth.uid() IS NOT NULL 
        AND auth.uid() = %I
      )
      WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = %I
      )', user_column_name, user_column_name);
    ELSE
      -- If no user column, make it admin-only
      EXECUTE 'DROP POLICY IF EXISTS "flight_price_tracking_policy" ON public.flight_price_tracking';
      EXECUTE 'CREATE POLICY "BULLETPROOF_flight_pricing_admin_only"
      ON public.flight_price_tracking
      FOR ALL
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin'')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin'')
      )';
    END IF;
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
      'policies_simplified', 3,
      'complexity_reduced', TRUE,
      'security_maintained', TRUE,
      'bulletproof_policies', TRUE,
      'admin_override_available', TRUE
    )
  );
END $$;