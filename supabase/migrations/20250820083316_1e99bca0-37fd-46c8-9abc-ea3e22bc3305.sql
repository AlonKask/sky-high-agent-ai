-- PHASE 5: Critical Policy Cleanup - Remove All Overlapping Policies
-- This will eliminate the multiple policy conflicts causing security risks

-- Get list of all policies for problematic tables
-- We'll drop ALL existing policies and keep only our secure isolation policies

-- BOOKINGS TABLE: Drop all existing policies except our isolation policy
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on bookings except our secure one
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'bookings' 
        AND policyname != 'bookings_absolute_isolation'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.bookings';
    END LOOP;
END $$;

-- EMAIL_EXCHANGES TABLE: Drop all existing policies except our isolation policy  
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on email_exchanges except our secure one
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'email_exchanges' 
        AND policyname != 'email_exchanges_absolute_isolation'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.email_exchanges';
    END LOOP;
END $$;

-- REQUESTS TABLE: Drop all existing policies except our isolation policy
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on requests except our secure one
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'requests' 
        AND policyname != 'requests_absolute_isolation'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.requests';
    END LOOP;
END $$;

-- Verify the cleanup worked - should show only 1 policy per table
SELECT 
  tablename,
  COUNT(*) as policy_count,
  array_agg(policyname) as remaining_policies
FROM pg_policies 
WHERE tablename IN ('clients', 'quotes', 'email_exchanges', 'bookings', 'requests')
GROUP BY tablename
ORDER BY tablename;