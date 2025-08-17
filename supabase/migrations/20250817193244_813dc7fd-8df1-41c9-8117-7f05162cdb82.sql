-- COMPREHENSIVE SECURITY HARDENING PLAN
-- Phase 1: Critical Security Architecture Cleanup

-- ===== MISSING TABLES SECURITY =====

-- Enable RLS on bookings table (Critical: booking data exposed)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bookings table
CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookings" 
ON public.bookings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable RLS on email_exchanges table (Critical: private emails exposed)
ALTER TABLE public.email_exchanges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_exchanges table
CREATE POLICY "Users can view their own email exchanges" 
ON public.email_exchanges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email exchanges" 
ON public.email_exchanges 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email exchanges" 
ON public.email_exchanges 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email exchanges" 
ON public.email_exchanges 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable RLS on messages table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies for messages table
        CREATE POLICY "Users can view their own messages" 
        ON public.messages 
        FOR SELECT 
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can create their own messages" 
        ON public.messages 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own messages" 
        ON public.messages 
        FOR UPDATE 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own messages" 
        ON public.messages 
        FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Enable RLS on booking_commissions table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_commissions') THEN
        ALTER TABLE public.booking_commissions ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies for booking_commissions table
        CREATE POLICY "Users can view their own commission data" 
        ON public.booking_commissions 
        FOR SELECT 
        USING (auth.uid() = agent_id);

        CREATE POLICY "System can create commission data" 
        ON public.booking_commissions 
        FOR INSERT 
        WITH CHECK (true);

        CREATE POLICY "Agents can update their own commission data" 
        ON public.booking_commissions 
        FOR UPDATE 
        USING (auth.uid() = agent_id);
    END IF;
END
$$;

-- ===== ENHANCED SECURITY FUNCTIONS =====

-- Create advanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(
    p_identifier text,
    p_endpoint text,
    p_ip_address inet DEFAULT NULL,
    p_max_requests integer DEFAULT 10,
    p_window_minutes integer DEFAULT 15
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_count integer;
    window_start timestamp with time zone;
    risk_score integer := 0;
BEGIN
    window_start := now() - (p_window_minutes || ' minutes')::interval;
    
    -- Clean up old rate limit entries
    DELETE FROM public.access_rate_limits 
    WHERE window_start < now() - interval '2 hours';
    
    -- Calculate risk score based on IP and behavior
    IF p_ip_address IS NOT NULL THEN
        SELECT COALESCE(COUNT(*), 0) INTO risk_score
        FROM public.security_events 
        WHERE details->>'ip_address' = p_ip_address::text
        AND severity IN ('high', 'critical')
        AND timestamp > now() - interval '24 hours';
    END IF;
    
    -- Adjust limits based on risk score
    IF risk_score > 5 THEN
        p_max_requests := GREATEST(1, p_max_requests / 4);
    ELSIF risk_score > 2 THEN
        p_max_requests := GREATEST(2, p_max_requests / 2);
    END IF;
    
    -- Get current request count
    SELECT COALESCE(SUM(request_count), 0) 
    INTO current_count
    FROM public.access_rate_limits
    WHERE identifier = p_identifier 
    AND endpoint = p_endpoint
    AND window_start > window_start;
    
    -- Check if limit exceeded
    IF current_count >= p_max_requests THEN
        -- Log critical rate limit violation
        PERFORM public.log_security_event(
            'enhanced_rate_limit_exceeded',
            'critical',
            jsonb_build_object(
                'identifier', p_identifier,
                'endpoint', p_endpoint,
                'ip_address', p_ip_address,
                'current_count', current_count,
                'max_requests', p_max_requests,
                'risk_score', risk_score,
                'window_minutes', p_window_minutes
            )
        );
        RETURN false;
    END IF;
    
    -- Record this request with enhanced metadata
    INSERT INTO public.access_rate_limits (identifier, endpoint, request_count, ip_address)
    VALUES (p_identifier, p_endpoint, 1, p_ip_address)
    ON CONFLICT (identifier, endpoint) 
    DO UPDATE SET 
        request_count = access_rate_limits.request_count + 1,
        ip_address = COALESCE(EXCLUDED.ip_address, access_rate_limits.ip_address),
        window_start = CASE 
            WHEN access_rate_limits.window_start < now() - (p_window_minutes || ' minutes')::interval 
            THEN now() 
            ELSE access_rate_limits.window_start 
        END;
    
    RETURN true;
END;
$$;

-- Create session anomaly detection function
CREATE OR REPLACE FUNCTION public.detect_session_anomaly(
    p_user_id uuid,
    p_device_fingerprint text,
    p_ip_address inet DEFAULT NULL,
    p_user_agent text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    anomaly_score integer := 0;
    last_session_data jsonb;
    result jsonb;
    force_logout boolean := false;
BEGIN
    -- Get last session data
    SELECT details INTO last_session_data
    FROM public.security_events 
    WHERE user_id = p_user_id 
    AND event_type = 'session_established'
    AND timestamp > now() - interval '30 days'
    ORDER BY timestamp DESC 
    LIMIT 1;
    
    -- Check device fingerprint anomaly
    IF last_session_data IS NOT NULL THEN
        IF last_session_data->>'device_fingerprint' != p_device_fingerprint THEN
            anomaly_score := anomaly_score + 3;
        END IF;
        
        -- Check IP geolocation anomaly (simplified check)
        IF p_ip_address IS NOT NULL AND last_session_data->>'ip_address' IS NOT NULL THEN
            IF last_session_data->>'ip_address' != p_ip_address::text THEN
                anomaly_score := anomaly_score + 2;
            END IF;
        END IF;
        
        -- Check user agent anomaly
        IF p_user_agent IS NOT NULL AND last_session_data->>'user_agent' IS NOT NULL THEN
            IF last_session_data->>'user_agent' != p_user_agent THEN
                anomaly_score := anomaly_score + 1;
            END IF;
        END IF;
    END IF;
    
    -- Check for suspicious activity patterns
    IF EXISTS (
        SELECT 1 FROM public.security_events 
        WHERE user_id = p_user_id 
        AND severity IN ('high', 'critical')
        AND timestamp > now() - interval '1 hour'
    ) THEN
        anomaly_score := anomaly_score + 5;
    END IF;
    
    -- Determine response based on anomaly score
    IF anomaly_score >= 8 THEN
        force_logout := true;
    END IF;
    
    -- Log session analysis
    PERFORM public.log_security_event(
        'session_anomaly_detection',
        CASE 
            WHEN anomaly_score >= 8 THEN 'critical'
            WHEN anomaly_score >= 5 THEN 'high'
            WHEN anomaly_score >= 3 THEN 'medium'
            ELSE 'low'
        END,
        jsonb_build_object(
            'anomaly_score', anomaly_score,
            'device_fingerprint', p_device_fingerprint,
            'ip_address', p_ip_address,
            'user_agent', p_user_agent,
            'force_logout', force_logout
        )
    );
    
    -- Build result
    result := jsonb_build_object(
        'anomaly_score', anomaly_score,
        'requires_verification', anomaly_score >= 5,
        'force_logout', force_logout,
        'risk_level', CASE 
            WHEN anomaly_score >= 8 THEN 'critical'
            WHEN anomaly_score >= 5 THEN 'high'
            WHEN anomaly_score >= 3 THEN 'medium'
            ELSE 'low'
        END
    );
    
    RETURN result;
END;
$$;

-- Create emergency data access function with full audit trail
CREATE OR REPLACE FUNCTION public.emergency_data_access(
    p_target_user_id uuid,
    p_data_type text,
    p_justification text,
    p_incident_id text DEFAULT NULL,
    p_emergency_type text DEFAULT 'operational'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    accessing_user_role app_role;
    emergency_token text;
    result jsonb;
BEGIN
    -- Verify accessing user has admin privileges
    SELECT role INTO accessing_user_role
    FROM public.user_roles
    WHERE user_id = auth.uid();
    
    IF accessing_user_role != 'admin' THEN
        -- Log unauthorized emergency access attempt
        PERFORM public.log_security_event(
            'unauthorized_emergency_access_attempt',
            'critical',
            jsonb_build_object(
                'target_user_id', p_target_user_id,
                'data_type', p_data_type,
                'attempted_by', auth.uid(),
                'justification', p_justification
            )
        );
        RAISE EXCEPTION 'Unauthorized: Admin role required for emergency data access';
    END IF;
    
    -- Generate emergency access token
    emergency_token := encode(gen_random_bytes(32), 'hex');
    
    -- Log emergency access with full audit trail
    PERFORM public.log_security_event(
        'emergency_data_access_granted',
        'critical',
        jsonb_build_object(
            'target_user_id', p_target_user_id,
            'data_type', p_data_type,
            'emergency_type', p_emergency_type,
            'justification', p_justification,
            'incident_id', p_incident_id,
            'emergency_token', emergency_token,
            'granted_by', auth.uid(),
            'requires_review', true
        )
    );
    
    -- Also log to sensitive data access audit
    PERFORM public.log_sensitive_data_access(
        p_target_user_id,
        'emergency_access_' || p_data_type,
        'EMERGENCY ACCESS: ' || p_justification || ' (Incident: ' || COALESCE(p_incident_id, 'N/A') || ')'
    );
    
    result := jsonb_build_object(
        'access_granted', true,
        'emergency_token', emergency_token,
        'expires_at', now() + interval '4 hours',
        'requires_review', true,
        'access_level', 'emergency_admin'
    );
    
    RETURN result;
END;
$$;

-- ===== ENHANCED SECURITY MONITORING =====

-- Add IP address column to access_rate_limits if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'access_rate_limits' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE public.access_rate_limits ADD COLUMN ip_address inet;
        CREATE INDEX idx_access_rate_limits_ip ON public.access_rate_limits(ip_address);
    END IF;
END
$$;

-- Create security metrics calculation function
CREATE OR REPLACE FUNCTION public.calculate_security_metrics(
    p_time_window_hours integer DEFAULT 24
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    metrics jsonb;
    threat_level text := 'low';
    risk_score integer := 0;
    critical_events integer;
    high_events integer;
    failed_logins integer;
    anomalies integer;
BEGIN
    -- Count security events by severity
    SELECT 
        COUNT(*) FILTER (WHERE severity = 'critical'),
        COUNT(*) FILTER (WHERE severity = 'high'),
        COUNT(*) FILTER (WHERE event_type LIKE '%login%' AND severity IN ('high', 'critical')),
        COUNT(*) FILTER (WHERE event_type = 'session_anomaly_detection' AND severity IN ('high', 'critical'))
    INTO critical_events, high_events, failed_logins, anomalies
    FROM public.security_events
    WHERE timestamp > now() - (p_time_window_hours || ' hours')::interval;
    
    -- Calculate risk score
    risk_score := (critical_events * 10) + (high_events * 5) + (failed_logins * 3) + (anomalies * 2);
    
    -- Determine threat level
    IF risk_score >= 50 THEN
        threat_level := 'critical';
    ELSIF risk_score >= 25 THEN
        threat_level := 'high';
    ELSIF risk_score >= 10 THEN
        threat_level := 'medium';
    END IF;
    
    -- Build metrics object
    metrics := jsonb_build_object(
        'threat_level', threat_level,
        'risk_score', risk_score,
        'time_window_hours', p_time_window_hours,
        'events', jsonb_build_object(
            'critical', critical_events,
            'high', high_events,
            'failed_logins', failed_logins,
            'anomalies', anomalies
        ),
        'calculated_at', now()
    );
    
    RETURN metrics;
END;
$$;

-- ===== ENHANCED VALIDATION AND TRIGGERS =====

-- Create comprehensive audit trigger for sensitive tables
CREATE OR REPLACE FUNCTION public.enhanced_sensitive_data_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    accessing_user_role app_role;
    data_owner_id uuid;
    operation_risk text := 'medium';
BEGIN
    -- Get accessing user's role
    SELECT role INTO accessing_user_role
    FROM public.user_roles
    WHERE user_id = auth.uid();
    
    -- Determine data owner
    data_owner_id := COALESCE(NEW.user_id, OLD.user_id);
    
    -- Calculate operation risk level
    IF TG_OP = 'DELETE' THEN
        operation_risk := 'high';
    ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME IN ('clients', 'gmail_credentials', 'quotes') THEN
        operation_risk := 'high';
    ELSIF auth.uid() != data_owner_id THEN
        operation_risk := 'critical';
    END IF;
    
    -- Log comprehensive audit event
    PERFORM public.log_security_event(
        'sensitive_data_operation',
        CASE operation_risk
            WHEN 'critical' THEN 'critical'
            WHEN 'high' THEN 'high'
            ELSE 'medium'
        END,
        jsonb_build_object(
            'table_name', TG_TABLE_NAME,
            'operation', TG_OP,
            'record_id', COALESCE(NEW.id, OLD.id),
            'data_owner', data_owner_id,
            'accessing_user', auth.uid(),
            'user_role', accessing_user_role,
            'operation_risk', operation_risk,
            'cross_user_access', auth.uid() != data_owner_id,
            'timestamp', now()
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply enhanced audit triggers to sensitive tables
DROP TRIGGER IF EXISTS enhanced_audit_clients ON public.clients;
CREATE TRIGGER enhanced_audit_clients
    AFTER INSERT OR UPDATE OR DELETE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.enhanced_sensitive_data_audit();

DROP TRIGGER IF EXISTS enhanced_audit_gmail_credentials ON public.gmail_credentials;
CREATE TRIGGER enhanced_audit_gmail_credentials
    AFTER INSERT OR UPDATE OR DELETE ON public.gmail_credentials
    FOR EACH ROW EXECUTE FUNCTION public.enhanced_sensitive_data_audit();

DROP TRIGGER IF EXISTS enhanced_audit_quotes ON public.quotes;
CREATE TRIGGER enhanced_audit_quotes
    AFTER INSERT OR UPDATE OR DELETE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.enhanced_sensitive_data_audit();

-- Apply to bookings table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        DROP TRIGGER IF EXISTS enhanced_audit_bookings ON public.bookings;
        CREATE TRIGGER enhanced_audit_bookings
            AFTER INSERT OR UPDATE OR DELETE ON public.bookings
            FOR EACH ROW EXECUTE FUNCTION public.enhanced_sensitive_data_audit();
    END IF;
END
$$;

-- Apply to email_exchanges table
DROP TRIGGER IF EXISTS enhanced_audit_email_exchanges ON public.email_exchanges;
CREATE TRIGGER enhanced_audit_email_exchanges
    AFTER INSERT OR UPDATE OR DELETE ON public.email_exchanges
    FOR EACH ROW EXECUTE FUNCTION public.enhanced_sensitive_data_audit();

-- ===== AUTOMATED SECURITY CLEANUP =====

-- Create automated security maintenance function
CREATE OR REPLACE FUNCTION public.automated_security_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Clean up old rate limit entries
    DELETE FROM public.access_rate_limits 
    WHERE window_start < now() - interval '24 hours';
    
    -- Clean up old oauth tokens
    DELETE FROM public.oauth_state_tokens 
    WHERE expires_at < now() OR used = true;
    
    -- Archive old security events (keep critical events longer)
    DELETE FROM public.security_events 
    WHERE severity IN ('low', 'medium') 
    AND timestamp < now() - interval '3 months';
    
    DELETE FROM public.security_events 
    WHERE severity = 'high' 
    AND timestamp < now() - interval '1 year';
    
    -- Keep critical events for 2 years (compliance requirement)
    DELETE FROM public.security_events 
    WHERE severity = 'critical' 
    AND timestamp < now() - interval '2 years';
    
    -- Log maintenance completion
    PERFORM public.log_security_event(
        'automated_security_maintenance',
        'low',
        jsonb_build_object(
            'maintenance_type', 'scheduled_cleanup',
            'completed_at', now()
        )
    );
END;
$$;

-- Log the completion of security hardening
INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
) VALUES (
    auth.uid(),
    'security_hardening_completed',
    'medium',
    jsonb_build_object(
        'phase', 'comprehensive_security_implementation',
        'tables_secured', ARRAY['clients', 'bookings', 'email_exchanges', 'quotes', 'gmail_credentials'],
        'functions_created', ARRAY['check_enhanced_rate_limit', 'detect_session_anomaly', 'emergency_data_access', 'calculate_security_metrics'],
        'implemented_at', now(),
        'status', 'complete'
    )
);