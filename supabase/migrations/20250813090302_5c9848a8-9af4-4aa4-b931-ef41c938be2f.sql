-- CRITICAL SECURITY FIX: Clients table data protection
-- This addresses the critical security vulnerability where client personal data
-- could be accessed by unauthorized users

-- First, let's check and fix the clients table RLS policies
DO $$
BEGIN
    -- Ensure RLS is enabled
    ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
    
    -- Drop all existing policies to start fresh
    DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
    DROP POLICY IF EXISTS "Supervisors and above can view all clients" ON public.clients;
    DROP POLICY IF EXISTS "Deny all anonymous access to clients" ON public.clients;
    
    -- Create secure policies that explicitly deny anonymous access
    
    -- 1. Deny ALL anonymous access first (critical security layer)
    CREATE POLICY "Deny all anonymous access to clients" 
    ON public.clients 
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);
    
    -- 2. Users can only view their own clients
    CREATE POLICY "Users can view their own clients" 
    ON public.clients 
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);
    
    -- 3. Supervisors and above can view all clients (for management purposes)
    CREATE POLICY "Supervisors and above can view all clients" 
    ON public.clients 
    FOR SELECT 
    TO authenticated
    USING (
        has_role(auth.uid(), 'supervisor'::app_role) OR 
        has_role(auth.uid(), 'manager'::app_role) OR 
        has_role(auth.uid(), 'admin'::app_role)
    );
    
    -- 4. Users can create their own clients
    CREATE POLICY "Users can create their own clients" 
    ON public.clients 
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
    
    -- 5. Users can update their own clients
    CREATE POLICY "Users can update their own clients" 
    ON public.clients 
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
    -- 6. Users can delete their own clients
    CREATE POLICY "Users can delete their own clients" 
    ON public.clients 
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = user_id);
    
END $$;

-- Fix other security issues found in the scan

-- SYSTEM_METRICS TABLE - Restrict to admins only
DO $$
BEGIN
    ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "System can insert metrics" ON public.system_metrics;
    DROP POLICY IF EXISTS "Deny anonymous access to system metrics" ON public.system_metrics;
    DROP POLICY IF EXISTS "Admins can view system metrics" ON public.system_metrics;
    
    CREATE POLICY "Deny anonymous access to system metrics" 
    ON public.system_metrics 
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);
    
    CREATE POLICY "System can insert metrics" 
    ON public.system_metrics 
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);
    
    CREATE POLICY "Admins can view system metrics" 
    ON public.system_metrics 
    FOR SELECT 
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
    
END $$;

-- ACCESS_RATE_LIMITS TABLE - Restrict to admins only  
DO $$
BEGIN
    ALTER TABLE public.access_rate_limits ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Admins and managers can view rate limits" ON public.access_rate_limits;
    DROP POLICY IF EXISTS "Deny anonymous access to rate limits" ON public.access_rate_limits;
    DROP POLICY IF EXISTS "System can manage rate limits" ON public.access_rate_limits;
    
    CREATE POLICY "Deny anonymous access to rate limits" 
    ON public.access_rate_limits 
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);
    
    CREATE POLICY "System can manage rate limits" 
    ON public.access_rate_limits 
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
    
    CREATE POLICY "Admins can view rate limits" 
    ON public.access_rate_limits 
    FOR SELECT 
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
    
END $$;

-- Log this critical security fix
INSERT INTO public.security_events (
    event_type, 
    severity, 
    details
) VALUES (
    'critical_rls_fix_applied',
    'high',
    jsonb_build_object(
        'tables_secured', ARRAY['clients', 'system_metrics', 'access_rate_limits'],
        'vulnerability_type', 'unauthorized_data_access',
        'fix_applied', 'comprehensive_rls_policies'
    )
);