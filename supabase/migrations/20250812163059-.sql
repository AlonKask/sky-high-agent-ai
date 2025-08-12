-- Harden RLS on public.quotes to restrict reads to owners and elevated roles
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive global SELECT policy allowing any authenticated user to view all quotes
DO $$
DECLARE pol TEXT;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'quotes' AND cmd = 'SELECT' AND qual = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.quotes', pol);
  END LOOP;
END$$;

-- Create owner-only SELECT policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'quotes' 
      AND policyname = 'Users can view their own quotes'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own quotes" 
      ON public.quotes FOR SELECT USING (auth.uid() = user_id)';
  END IF;
END$$;

-- Create elevated role SELECT policy (admin/manager/supervisor) if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'quotes' 
      AND policyname = 'Supervisors can view team quotes'
  ) THEN
    EXECUTE 'CREATE POLICY "Supervisors can view team quotes" 
      ON public.quotes FOR SELECT 
      USING (has_role(auth.uid(), ''supervisor''::app_role) OR has_role(auth.uid(), ''manager''::app_role) OR has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END$$;

-- Ensure owner INSERT/UPDATE/DELETE policies exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND cmd = 'INSERT'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can create their own quotes" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND cmd = 'UPDATE'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own quotes" ON public.quotes FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND cmd = 'DELETE'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete their own quotes" ON public.quotes FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END$$;