-- Tighten RLS for sensitive tables: clients, requests, email_exchanges, notifications

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive global SELECT policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'clients' 
      AND policyname = 'Authenticated users can view all clients'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can view all clients" ON public.clients';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'requests' 
      AND policyname = 'Authenticated users can view all requests'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can view all requests" ON public.requests';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'email_exchanges' 
      AND policyname = 'Authenticated users can view all email exchanges'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can view all email exchanges" ON public.email_exchanges';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'notifications' 
      AND policyname = 'Authenticated users can view all notifications'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can view all notifications" ON public.notifications';
  END IF;
END$$;

-- Create owner-only SELECT policies if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'clients' 
      AND policyname = 'Users can view their own clients'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own clients" 
      ON public.clients FOR SELECT USING (auth.uid() = user_id)';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'requests' 
      AND policyname = 'Users can view their own requests'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own requests" 
      ON public.requests FOR SELECT USING (auth.uid() = user_id)';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'email_exchanges' 
      AND policyname = 'Users can view their own email exchanges'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own email exchanges" 
      ON public.email_exchanges FOR SELECT USING (auth.uid() = user_id)';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'notifications' 
      AND policyname = 'Users can view their own notifications'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own notifications" 
      ON public.notifications FOR SELECT USING (auth.uid() = user_id)';
  END IF;
END$$;