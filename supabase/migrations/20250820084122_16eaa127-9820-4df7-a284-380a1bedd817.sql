-- Security Fix: Remove problematic constraint and improve security monitoring

-- Drop the problematic constraint entirely 
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;

-- Add performance indexes for security monitoring
CREATE INDEX IF NOT EXISTS idx_security_events_event_type 
ON public.security_events(event_type);

CREATE INDEX IF NOT EXISTS idx_security_events_timestamp 
ON public.security_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_user_severity 
ON public.security_events(user_id, severity, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_severity 
ON public.security_events(severity, timestamp DESC);

-- Create enhanced security monitoring function
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_event_type text,
    p_severity text DEFAULT 'medium',
    p_details jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Insert the security event with enhanced metadata
    INSERT INTO public.security_events (
        user_id,
        event_type, 
        severity,
        details,
        user_agent,
        ip_address,
        timestamp
    ) VALUES (
        auth.uid(),
        COALESCE(p_event_type, 'security_event_logged'),
        COALESCE(p_severity, 'medium'),
        COALESCE(p_details, '{}'::jsonb) || jsonb_build_object(
            'timestamp', now()::text,
            'session_info', jsonb_build_object(
                'authenticated', auth.uid() IS NOT NULL,
                'user_id', auth.uid()
            )
        ),
        current_setting('request.headers', true)::json->>'user-agent',
        inet_client_addr(),
        now()
    );
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- If logging fails, at least log to server logs
    RAISE NOTICE 'Security event logging failed: % (%) - %', p_event_type, p_severity, SQLERRM;
    RETURN false;
END;
$$;