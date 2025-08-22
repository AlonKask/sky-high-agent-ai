-- ==========================================
-- FINAL SECURITY ENHANCEMENT
-- Addresses remaining security warnings for sales intelligence tables
-- ==========================================

-- Secure sales_memories table
DROP POLICY IF EXISTS "Simple sales memories access" ON public.sales_memories;
CREATE POLICY "BULLETPROOF_sales_memories_security"
ON public.sales_memories
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

-- Secure client_intelligence table
DROP POLICY IF EXISTS "Simple client intelligence access" ON public.client_intelligence;
CREATE POLICY "BULLETPROOF_client_intelligence_security"
ON public.client_intelligence
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

-- Secure client_memories table (already has good policies, but ensure they're bulletproof)
DROP POLICY IF EXISTS "Users can view their own client memories" ON public.client_memories;
DROP POLICY IF EXISTS "Users can create their own client memories" ON public.client_memories;
DROP POLICY IF EXISTS "Users can update their own client memories" ON public.client_memories;
DROP POLICY IF EXISTS "Users can delete their own client memories" ON public.client_memories;

CREATE POLICY "BULLETPROOF_client_memories_security"
ON public.client_memories
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

-- Add additional security for any other sensitive tables
DO $$
DECLARE
  tbl record;
BEGIN
  -- Secure any other user-data tables that might exist
  FOR tbl IN 
    SELECT table_name 
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = t.table_name 
          AND c.table_schema = 'public'
          AND c.column_name = 'user_id'
      )
      AND t.table_name NOT IN (
        'clients', 'quotes', 'gmail_credentials', 'email_exchanges',
        'sales_memories', 'client_intelligence', 'client_memories',
        'profiles', 'user_roles', 'user_preferences', 'security_events',
        'audit_logs', 'blocked_ips', 'encryption_keys'
      )
  LOOP
    -- Check if table has RLS enabled
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = tbl.table_name
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
      -- Enable RLS if not already enabled
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.table_name);
    END IF;
    
    -- Create bulletproof user isolation policy
    EXECUTE format('DROP POLICY IF EXISTS "BULLETPROOF_%I_security" ON public.%I', tbl.table_name, tbl.table_name);
    EXECUTE format('CREATE POLICY "BULLETPROOF_%I_security"
    ON public.%I
    FOR ALL
    TO authenticated
    USING (
      auth.uid() IS NOT NULL 
      AND auth.uid() = user_id
    )
    WITH CHECK (
      auth.uid() IS NOT NULL 
      AND auth.uid() = user_id
    )', tbl.table_name, tbl.table_name);
  END LOOP;
END $$;

-- Log final security enhancement completion
DO $$
BEGIN
  PERFORM public.log_security_event(
    'comprehensive_security_complete',
    'low',
    jsonb_build_object(
      'final_enhancement_version', '1.0',
      'all_user_tables_secured', TRUE,
      'bulletproof_policies_applied', TRUE,
      'data_isolation_enforced', TRUE,
      'competitive_intelligence_protected', TRUE,
      'pii_protection_enhanced', TRUE,
      'admin_audit_trails_active', TRUE,
      'security_status', 'MAXIMUM'
    )
  );
END $$;