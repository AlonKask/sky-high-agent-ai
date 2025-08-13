-- CRITICAL: Remove all permissive policies that allow public access
-- These are major security vulnerabilities allowing anonymous access

-- Clean up all conflicting policies on quotes table
DROP POLICY IF EXISTS "DENY all anonymous access to quotes" ON public.quotes;
DROP POLICY IF EXISTS "Deny anonymous access to quotes" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes DELETE - owner only" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes INSERT - owner only" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes SELECT - financial data protection" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes SELECT - strict access control" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes UPDATE - owner and authorized only" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes UPDATE - restricted access" ON public.quotes;
DROP POLICY IF EXISTS "Secure financial data access" ON public.quotes;
DROP POLICY IF EXISTS "Secure financial quote access policy" ON public.quotes;
DROP POLICY IF EXISTS "Secure quotes access - principle of least privilege" ON public.quotes;
DROP POLICY IF EXISTS "Secure quotes creation" ON public.quotes;
DROP POLICY IF EXISTS "Secure quotes modification" ON public.quotes;
DROP POLICY IF EXISTS "Supervisors can view all quotes" ON public.quotes;

-- Clean up all conflicting policies on bookings table
DROP POLICY IF EXISTS "DENY all anonymous access to bookings" ON public.bookings;
DROP POLICY IF EXISTS "Deny anonymous access to bookings" ON public.bookings;
DROP POLICY IF EXISTS "Enhanced bookings DELETE - owner only" ON public.bookings;
DROP POLICY IF EXISTS "Enhanced bookings INSERT - owner only" ON public.bookings;
DROP POLICY IF EXISTS "Enhanced bookings SELECT - strict access control" ON public.bookings;
DROP POLICY IF EXISTS "Enhanced bookings UPDATE - owner and authorized only" ON public.bookings;
DROP POLICY IF EXISTS "Supervisors can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Supervisors can view team bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete their own bookings" ON public.bookings;

-- Create SINGLE, SECURE policy set for quotes table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quotes' AND table_schema = 'public') THEN
    -- Block all anonymous access first
    CREATE POLICY "Block all anonymous access to quotes"
    ON public.quotes
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

    -- Allow authenticated users to access only their own quotes
    CREATE POLICY "Users can access their own quotes only"
    ON public.quotes
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can create their own quotes only"
    ON public.quotes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own quotes only"
    ON public.quotes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own quotes only"
    ON public.quotes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Create SINGLE, SECURE policy set for bookings table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public') THEN
    -- Block all anonymous access first
    CREATE POLICY "Block all anonymous access to bookings"
    ON public.bookings
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

    -- Allow authenticated users to access only their own bookings
    CREATE POLICY "Users can access their own bookings only"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can create their own bookings only"
    ON public.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own bookings only"
    ON public.bookings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own bookings only"
    ON public.bookings
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Ensure RLS is enabled on all sensitive tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_client_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_credentials ENABLE ROW LEVEL SECURITY;

-- Enable RLS on other tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quotes' AND table_schema = 'public') THEN
    ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public') THEN
    ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;