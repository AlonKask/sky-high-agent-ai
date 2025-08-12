-- Harden RLS on public.bookings to prevent cross-user reads
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive SELECT policy allowing any authenticated to view all bookings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'bookings' 
      AND policyname = 'Authenticated users can view all bookings'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can view all bookings" ON public.bookings';
  END IF;
END$$;

-- Add owner-only SELECT policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'bookings' 
      AND policyname = 'Users can view their own bookings'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own bookings" 
      ON public.bookings 
      FOR SELECT 
      USING (auth.uid() = user_id)';
  END IF;
END$$;

-- Keep existing elevated-role ALL policy intact (no change)
