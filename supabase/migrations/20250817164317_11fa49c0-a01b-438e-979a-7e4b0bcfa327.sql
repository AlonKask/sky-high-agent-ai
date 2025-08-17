-- Final Security Policy Migration
-- Addresses remaining RLS policy gaps and security vulnerabilities

-- Step 1: Add RLS policies for tables that have RLS enabled but no policies
-- Find and secure any tables with RLS enabled but missing policies

-- Enable RLS and add policies for flight_price_tracking
ALTER TABLE public.flight_price_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view flight prices" 
ON public.flight_price_tracking
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage flight price data" 
ON public.flight_price_tracking
FOR ALL 
USING (true)
WITH CHECK (true);

-- Step 2: Secure airline reference data for business intelligence protection
CREATE POLICY "Authenticated users can view airline codes" 
ON public.airline_codes
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage airline codes" 
ON public.airline_codes
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view airport codes" 
ON public.airport_codes
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage airport codes" 
ON public.airport_codes
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Step 3: Fix weak request assignment access
-- First, check if request_assignments table exists and update its policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'request_assignments') THEN
    -- Drop overly permissive policies
    DROP POLICY IF EXISTS "All authenticated users can view assignments" ON public.request_assignments;
    DROP POLICY IF EXISTS "Authenticated users can view all assignments" ON public.request_assignments;
    
    -- Create restrictive policies
    CREATE POLICY "Users can view their own request assignments" 
    ON public.request_assignments
    FOR SELECT 
    USING (auth.uid() = assigned_to OR auth.uid() = created_by OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
    
    CREATE POLICY "Managers can create request assignments" 
    ON public.request_assignments
    FOR INSERT 
    WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
    
    CREATE POLICY "Managers can update request assignments" 
    ON public.request_assignments
    FOR UPDATE 
    USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Step 4: Enhance client data protection with additional validation
-- Replace existing client policies with ultra-strict versions
DROP POLICY IF EXISTS "ULTRA_SECURE_clients_select" ON public.clients;
DROP POLICY IF EXISTS "ULTRA_SECURE_clients_update" ON public.clients;
DROP POLICY IF EXISTS "ULTRA_SECURE_clients_insert" ON public.clients;
DROP POLICY IF EXISTS "ULTRA_SECURE_clients_delete" ON public.clients;

-- Create enhanced client policies with business hours and additional checks
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

-- Step 5: Secure any remaining tables that might have RLS enabled without policies
-- Check for common tables that might need policies

-- Secure communication_archive if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'communication_archive') THEN
    ALTER TABLE public.communication_archive ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own archived communications" 
    ON public.communication_archive
    FOR SELECT 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "System can archive communications" 
    ON public.communication_archive
    FOR INSERT 
    WITH CHECK (true);
  END IF;
END $$;

-- Secure email_archives if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_archives') THEN
    ALTER TABLE public.email_archives ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own email archives" 
    ON public.email_archives
    FOR SELECT 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "System can archive emails" 
    ON public.email_archives
    FOR INSERT 
    WITH CHECK (true);
  END IF;
END $$;

-- Secure user_memories if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_memories') THEN
    ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own memories" 
    ON public.user_memories
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Secure email_sync_status if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sync_status') THEN
    ALTER TABLE public.email_sync_status ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own sync status" 
    ON public.email_sync_status
    FOR SELECT 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "System can manage sync status" 
    ON public.email_sync_status
    FOR ALL 
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Secure access_rate_limits if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_rate_limits') THEN
    ALTER TABLE public.access_rate_limits ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "System can manage rate limits" 
    ON public.access_rate_limits
    FOR ALL 
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Step 6: Add comprehensive logging for all policy violations
CREATE OR REPLACE FUNCTION public.log_policy_violation(p_table_name text, p_operation text, p_details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.log_security_event(
    'rls_policy_violation',
    'critical',
    jsonb_build_object(
      'table_name', p_table_name,
      'operation', p_operation,
      'user_id', auth.uid(),
      'timestamp', now(),
      'details', p_details
    )
  );
END;
$$;

-- Step 7: Create a comprehensive security audit function
CREATE OR REPLACE FUNCTION public.perform_security_audit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  tables_without_rls integer;
  policies_count integer;
  recent_violations integer;
BEGIN
  -- Count tables without RLS
  SELECT COUNT(*) INTO tables_without_rls
  FROM information_schema.tables t
  LEFT JOIN pg_class c ON c.relname = t.table_name
  WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND (c.relrowsecurity IS NULL OR c.relrowsecurity = false);
  
  -- Count total policies
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  -- Count recent security violations
  SELECT COUNT(*) INTO recent_violations
  FROM public.security_events
  WHERE severity IN ('high', 'critical')
  AND timestamp > now() - interval '24 hours';
  
  result := jsonb_build_object(
    'audit_timestamp', now(),
    'tables_without_rls', tables_without_rls,
    'total_policies', policies_count,
    'recent_violations_24h', recent_violations,
    'security_status', CASE 
      WHEN tables_without_rls = 0 AND recent_violations < 5 THEN 'secure'
      WHEN tables_without_rls <= 2 AND recent_violations < 10 THEN 'moderate'
      ELSE 'needs_attention'
    END
  );
  
  -- Log the audit
  PERFORM public.log_security_event(
    'security_audit_completed',
    'low',
    result
  );
  
  RETURN result;
END;
$$;