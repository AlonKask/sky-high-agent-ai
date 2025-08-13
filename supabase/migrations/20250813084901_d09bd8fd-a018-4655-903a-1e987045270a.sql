-- CRITICAL SECURITY FIX: Enable RLS and fix policies for publicly accessible tables

-- First, let's check if quotes and bookings tables have RLS enabled
-- If they do, we'll drop existing policies and recreate them properly

-- 4. QUOTES TABLE - Drop existing policies if they exist and recreate
DO $$ 
BEGIN
    -- Drop all existing policies for quotes
    DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Supervisors can view all quotes" ON public.quotes;
    DROP POLICY IF EXISTS "Deny anonymous access to quotes" ON public.quotes;
    
    -- Enable RLS if not already enabled
    ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
    
    -- Create comprehensive policies
    CREATE POLICY "Users can view their own quotes" 
    ON public.quotes 
    FOR SELECT 
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can create their own quotes" 
    ON public.quotes 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own quotes" 
    ON public.quotes 
    FOR UPDATE 
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own quotes" 
    ON public.quotes 
    FOR DELETE 
    USING (auth.uid() = user_id);

    CREATE POLICY "Supervisors can view all quotes" 
    ON public.quotes 
    FOR SELECT 
    USING (
      has_role(auth.uid(), 'supervisor'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role) 
      OR has_role(auth.uid(), 'admin'::app_role)
    );

    CREATE POLICY "Deny anonymous access to quotes" 
    ON public.quotes 
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);
END $$;

-- 5. BOOKINGS TABLE - Drop existing policies if they exist and recreate
DO $$
BEGIN
    -- Drop all existing policies for bookings
    DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Users can delete their own bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Supervisors can view all bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Deny anonymous access to bookings" ON public.bookings;
    
    -- Enable RLS if not already enabled
    ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
    
    -- Create comprehensive policies
    CREATE POLICY "Users can view their own bookings" 
    ON public.bookings 
    FOR SELECT 
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can create their own bookings" 
    ON public.bookings 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own bookings" 
    ON public.bookings 
    FOR UPDATE 
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own bookings" 
    ON public.bookings 
    FOR DELETE 
    USING (auth.uid() = user_id);

    CREATE POLICY "Supervisors can view all bookings" 
    ON public.bookings 
    FOR SELECT 
    USING (
      has_role(auth.uid(), 'supervisor'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role) 
      OR has_role(auth.uid(), 'admin'::app_role)
    );

    CREATE POLICY "Deny anonymous access to bookings" 
    ON public.bookings 
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);
END $$;