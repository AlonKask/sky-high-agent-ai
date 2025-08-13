-- FINAL SECURITY FIX: Complete RLS protection with proper policy management

-- USER_SESSIONS TABLE
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
    
    -- Drop and recreate policies
    DROP POLICY IF EXISTS "Users can view their own sessions only" ON public.user_sessions;
    DROP POLICY IF EXISTS "System can insert sessions" ON public.user_sessions;
    DROP POLICY IF EXISTS "System can update sessions" ON public.user_sessions;
    DROP POLICY IF EXISTS "System can delete sessions" ON public.user_sessions;
    DROP POLICY IF EXISTS "Deny anonymous access to user sessions" ON public.user_sessions;
    
    CREATE POLICY "Users can view their own sessions only" 
    ON public.user_sessions 
    FOR SELECT 
    USING (auth.uid() = user_id);

    CREATE POLICY "System can insert sessions" 
    ON public.user_sessions 
    FOR INSERT 
    WITH CHECK (true);

    CREATE POLICY "System can update sessions" 
    ON public.user_sessions 
    FOR UPDATE 
    USING (true);

    CREATE POLICY "System can delete sessions" 
    ON public.user_sessions 
    FOR DELETE 
    USING (true);

    CREATE POLICY "Deny anonymous access to user sessions" 
    ON public.user_sessions 
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);
END $$;

-- SECURITY_EVENTS TABLE
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
    
    -- Drop and recreate policies
    DROP POLICY IF EXISTS "Only admins can view security events" ON public.security_events;
    DROP POLICY IF EXISTS "System can log security events" ON public.security_events;
    DROP POLICY IF EXISTS "Deny anonymous access to security events" ON public.security_events;
    
    CREATE POLICY "Only admins can view security events" 
    ON public.security_events 
    FOR SELECT 
    USING (has_role(auth.uid(), 'admin'::app_role));

    CREATE POLICY "System can log security events" 
    ON public.security_events 
    FOR INSERT 
    WITH CHECK (true);

    CREATE POLICY "Deny anonymous access to security events" 
    ON public.security_events 
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);
END $$;

-- AUDIT_LOGS TABLE
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
    
    -- Drop and recreate policies
    DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Deny anonymous access to audit logs" ON public.audit_logs;
    
    CREATE POLICY "Only admins can view audit logs" 
    ON public.audit_logs 
    FOR SELECT 
    USING (has_role(auth.uid(), 'admin'::app_role));

    CREATE POLICY "System can create audit logs" 
    ON public.audit_logs 
    FOR INSERT 
    WITH CHECK (true);

    CREATE POLICY "Deny anonymous access to audit logs" 
    ON public.audit_logs 
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);
END $$;

-- OAUTH_STATE_TOKENS TABLE
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE public.oauth_state_tokens ENABLE ROW LEVEL SECURITY;
    
    -- Drop and recreate policies
    DROP POLICY IF EXISTS "Users can access their own oauth tokens" ON public.oauth_state_tokens;
    DROP POLICY IF EXISTS "System can manage oauth tokens" ON public.oauth_state_tokens;
    DROP POLICY IF EXISTS "Deny anonymous access to oauth tokens" ON public.oauth_state_tokens;
    
    CREATE POLICY "Users can access their own oauth tokens" 
    ON public.oauth_state_tokens 
    FOR ALL
    USING (auth.uid() = user_id);

    CREATE POLICY "System can manage oauth tokens" 
    ON public.oauth_state_tokens 
    FOR ALL
    USING (true)
    WITH CHECK (true);

    CREATE POLICY "Deny anonymous access to oauth tokens" 
    ON public.oauth_state_tokens 
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);
END $$;