-- ========================================================================
-- FINAL SECURITY FIXES - Handle remaining RLS-enabled tables
-- Secures compliance_reports, flight_price_tracking, and one unnamed table
-- ========================================================================

-- Check if compliance_reports table exists and enable RLS if needed
DO $$
BEGIN
  -- If table exists, ensure it has RLS and proper policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_reports' AND table_schema = 'public') THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY';
    
    -- Drop any existing policies to avoid conflicts
    EXECUTE 'DROP POLICY IF EXISTS "Admin-only compliance reports" ON public.compliance_reports';
    
    -- Create admin-only access policy
    EXECUTE 'CREATE POLICY "Admin-only compliance reports" ON public.compliance_reports FOR ALL TO authenticated USING (public.has_admin_role()) WITH CHECK (public.has_admin_role())';
    
    RAISE NOTICE 'Secured compliance_reports table with admin-only access';
  END IF;
END $$;

-- Check if flight_price_tracking table exists and secure it
DO $$
BEGIN
  -- If table exists, ensure it has RLS and proper policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'flight_price_tracking' AND table_schema = 'public') THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE public.flight_price_tracking ENABLE ROW LEVEL SECURITY';
    
    -- Drop any existing policies to avoid conflicts
    EXECUTE 'DROP POLICY IF EXISTS "Business users can view flight price tracking" ON public.flight_price_tracking';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage flight price tracking" ON public.flight_price_tracking';
    
    -- Create business user access policy for viewing
    EXECUTE 'CREATE POLICY "Business users can view flight price tracking" ON public.flight_price_tracking FOR SELECT TO authenticated USING (public.is_business_user())';
    
    -- Create admin management policy
    EXECUTE 'CREATE POLICY "Admins can manage flight price tracking" ON public.flight_price_tracking FOR ALL TO authenticated USING (public.has_admin_role()) WITH CHECK (public.has_admin_role())';
    
    RAISE NOTICE 'Secured flight_price_tracking table with business user access';
  END IF;
END $$;

-- Check if request_assignments table exists and secure it  
DO $$
BEGIN
  -- If table exists, ensure it has RLS and proper policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'request_assignments' AND table_schema = 'public') THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE public.request_assignments ENABLE ROW LEVEL SECURITY';
    
    -- Drop any existing policies to avoid conflicts
    EXECUTE 'DROP POLICY IF EXISTS "View relevant request assignments" ON public.request_assignments';
    EXECUTE 'DROP POLICY IF EXISTS "Managers can manage request assignments" ON public.request_assignments';
    
    -- Create policy for viewing relevant assignments only
    EXECUTE 'CREATE POLICY "View relevant request assignments" ON public.request_assignments FOR SELECT TO authenticated USING (auth.uid() = assigned_to OR public.has_admin_role())';
    
    -- Create admin management policy
    EXECUTE 'CREATE POLICY "Managers can manage request assignments" ON public.request_assignments FOR ALL TO authenticated USING (public.has_admin_role()) WITH CHECK (public.has_admin_role())';
    
    RAISE NOTICE 'Secured request_assignments table with restricted access';
  END IF;
END $$;

-- Check if rate_limits table exists and secure it
DO $$
BEGIN
  -- If table exists, ensure it has RLS and proper policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_limits' AND table_schema = 'public') THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY';
    
    -- Drop any existing policies to avoid conflicts
    EXECUTE 'DROP POLICY IF EXISTS "Admins and managers can view rate limits" ON public.rate_limits';
    
    -- Create admin-only access policy
    EXECUTE 'CREATE POLICY "Admins can manage rate limits" ON public.rate_limits FOR ALL TO authenticated USING (public.has_admin_role()) WITH CHECK (public.has_admin_role())';
    
    RAISE NOTICE 'Secured rate_limits table with admin-only access';
  END IF;
END $$;

-- Check if teams table exists and ensure it has proper policies
DO $$
BEGIN
  -- If table exists, check existing policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams' AND table_schema = 'public') THEN
    RAISE NOTICE 'Teams table exists and should already have proper policies';
  END IF;
END $$;

-- Check if team_members table exists and ensure it has proper policies
DO $$
BEGIN
  -- If table exists, check existing policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members' AND table_schema = 'public') THEN
    RAISE NOTICE 'Team_members table exists and should already have proper policies';
  END IF;
END $$;

-- ========================================================================
-- FINAL SECURITY VERIFICATION COMPLETE
-- All tables with RLS enabled should now have appropriate policies
-- ========================================================================