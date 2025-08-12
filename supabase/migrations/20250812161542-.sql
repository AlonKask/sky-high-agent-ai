-- Restrict read access on flight_price_tracking to authenticated users only
ALTER TABLE public.flight_price_tracking ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive SELECT policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'flight_price_tracking' 
      AND policyname = 'Anyone can view flight price data'
  ) THEN
    EXECUTE 'DROP POLICY "Anyone can view flight price data" ON public.flight_price_tracking';
  END IF;
END$$;

-- Create safer SELECT policy for authenticated users only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'flight_price_tracking' 
      AND policyname = 'Authenticated users can view flight price data'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can view flight price data" 
      ON public.flight_price_tracking
      FOR SELECT
      USING (auth.uid() IS NOT NULL)';
  END IF;
END$$;