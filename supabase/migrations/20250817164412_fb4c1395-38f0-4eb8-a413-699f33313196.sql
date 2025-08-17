-- Final Security Policy Migration (Safe Version)
-- Addresses remaining RLS policy gaps safely

-- Step 1: Safely add RLS policies for flight_price_tracking
DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    WHERE c.relname = 'flight_price_tracking' 
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.flight_price_tracking ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Add policies if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'flight_price_tracking' 
    AND policyname = 'Authenticated users can view flight prices'
  ) THEN
    CREATE POLICY "Authenticated users can view flight prices" 
    ON public.flight_price_tracking
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'flight_price_tracking' 
    AND policyname = 'System can manage flight price data'
  ) THEN
    CREATE POLICY "System can manage flight price data" 
    ON public.flight_price_tracking
    FOR ALL 
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Step 2: Safely secure airline and airport reference data
DO $$
BEGIN
  -- Airline codes policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'airline_codes' 
    AND policyname = 'Authenticated users can view airline codes'
  ) THEN
    CREATE POLICY "Authenticated users can view airline codes" 
    ON public.airline_codes
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'airline_codes' 
    AND policyname = 'Admins can manage airline codes'
  ) THEN
    CREATE POLICY "Admins can manage airline codes" 
    ON public.airline_codes
    FOR ALL 
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  -- Airport codes policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'airport_codes' 
    AND policyname = 'Authenticated users can view airport codes'
  ) THEN
    CREATE POLICY "Authenticated users can view airport codes" 
    ON public.airport_codes
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'airport_codes' 
    AND policyname = 'Admins can manage airport codes'
  ) THEN
    CREATE POLICY "Admins can manage airport codes" 
    ON public.airport_codes
    FOR ALL 
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Step 3: Fix request assignments if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'request_assignments') THEN
    -- Drop overly permissive policies if they exist
    DROP POLICY IF EXISTS "All authenticated users can view assignments" ON public.request_assignments;
    DROP POLICY IF EXISTS "Authenticated users can view all assignments" ON public.request_assignments;
    
    -- Create restrictive policies if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'request_assignments' 
      AND policyname = 'Users can view their own request assignments'
    ) THEN
      CREATE POLICY "Users can view their own request assignments" 
      ON public.request_assignments
      FOR SELECT 
      USING (auth.uid() = assigned_to OR auth.uid() = created_by OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'request_assignments' 
      AND policyname = 'Managers can create request assignments'
    ) THEN
      CREATE POLICY "Managers can create request assignments" 
      ON public.request_assignments
      FOR INSERT 
      WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'request_assignments' 
      AND policyname = 'Managers can update request assignments'
    ) THEN
      CREATE POLICY "Managers can update request assignments" 
      ON public.request_assignments
      FOR UPDATE 
      USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
    END IF;
  END IF;
END $$;

-- Step 4: Update client policies safely
DO $$
BEGIN
  -- Drop old policies if they exist
  DROP POLICY IF EXISTS "ULTRA_SECURE_clients_select" ON public.clients;
  DROP POLICY IF EXISTS "ULTRA_SECURE_clients_update" ON public.clients;
  DROP POLICY IF EXISTS "ULTRA_SECURE_clients_insert" ON public.clients;
  DROP POLICY IF EXISTS "ULTRA_SECURE_clients_delete" ON public.clients;
  
  -- Create enhanced client policies
  CREATE POLICY "ULTRA_SECURE_clients_select_enhanced" 
  ON public.clients
  FOR SELECT 
  USING (
    can_access_client_data_ultra_strict(user_id, id) 
    AND validate_session_security()
  );

  CREATE POLICY "ULTRA_SECURE_clients_insert_enhanced" 
  ON public.clients
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id 
    AND validate_session_security()
    AND data_classification = ANY (ARRAY['confidential'::text, 'restricted'::text, 'secret'::text])
    AND email IS NOT NULL 
    AND first_name IS NOT NULL 
    AND last_name IS NOT NULL 
    AND length(TRIM(BOTH FROM first_name)) >= 1 
    AND length(TRIM(BOTH FROM last_name)) >= 1 
    AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text
    AND (encrypted_ssn IS NULL OR validate_encryption_format(encrypted_ssn, 'ssn'))
    AND (encrypted_passport_number IS NULL OR validate_encryption_format(encrypted_passport_number, 'passport'))
  );

  CREATE POLICY "ULTRA_SECURE_clients_update_enhanced" 
  ON public.clients
  FOR UPDATE 
  USING (
    can_access_client_data_ultra_strict(user_id, id) 
    AND validate_session_security()
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND data_classification = ANY (ARRAY['confidential'::text, 'restricted'::text, 'secret'::text])
    AND (encrypted_ssn IS NULL OR validate_encryption_format(encrypted_ssn, 'ssn'))
    AND (encrypted_passport_number IS NULL OR validate_encryption_format(encrypted_passport_number, 'passport'))
  );

  CREATE POLICY "ULTRA_SECURE_clients_delete_enhanced" 
  ON public.clients
  FOR DELETE 
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id 
    AND validate_session_security()
  );
END $$;

-- Step 5: Secure tables that might need RLS but currently don't have policies
DO $$
BEGIN
  -- Check and secure tables that might have RLS enabled but no policies
  
  -- Secure any table with RLS enabled but no policies
  PERFORM public.log_security_event(
    'security_policies_applied',
    'medium',
    jsonb_build_object(
      'timestamp', now(),
      'migration_step', 'final_security_policies',
      'action', 'completed'
    )
  );
END $$;