-- Final Security Cleanup - Simplified approach to fix remaining policy conflicts

-- Clean up conflicting policies on quotes table
DO $$
BEGIN
  -- Ensure RLS is enabled
  ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
  
  -- Drop any conflicting public role policies
  DROP POLICY IF EXISTS "Public can view quotes" ON public.quotes;
  DROP POLICY IF EXISTS "Anonymous can view quotes" ON public.quotes;
  
  -- Add DENY ALL for anonymous users
  CREATE POLICY "DENY all anonymous access to quotes" ON public.quotes
    FOR ALL TO anon USING (false) WITH CHECK (false);
    
  RAISE NOTICE 'Quotes table secured';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Quotes table may not exist: %', SQLERRM;
END $$;

-- Clean up conflicting policies on bookings table  
DO $$
BEGIN
  -- Ensure RLS is enabled
  ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
  
  -- Drop any conflicting public role policies
  DROP POLICY IF EXISTS "Public can view bookings" ON public.bookings;
  DROP POLICY IF EXISTS "Anonymous can view bookings" ON public.bookings;
  
  -- Add DENY ALL for anonymous users
  CREATE POLICY "DENY all anonymous access to bookings" ON public.bookings
    FOR ALL TO anon USING (false) WITH CHECK (false);
    
  RAISE NOTICE 'Bookings table secured';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Bookings table may not exist: %', SQLERRM;
END $$;