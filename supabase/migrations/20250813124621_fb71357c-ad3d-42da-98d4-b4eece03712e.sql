-- Remove legacy permissive policies that grant access to public role
-- These policies conflict with our enhanced security model

-- Drop legacy policies on bookings table
DROP POLICY IF EXISTS "Authenticated users: bookings INSERT" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users: bookings SELECT" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users: bookings UPDATE" ON public.bookings;

-- Drop legacy policies on quotes table  
DROP POLICY IF EXISTS "Authenticated users: quotes INSERT" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users: quotes SELECT" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users: quotes UPDATE" ON public.quotes;

-- Drop any other legacy permissive policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;