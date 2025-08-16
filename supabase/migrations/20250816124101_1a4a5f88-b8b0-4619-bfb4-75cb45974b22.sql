-- COMPREHENSIVE SECURITY FIX PLAN - Fixed
-- Addresses 2 Critical Warnings + 4 Recommendations

-- Fix function parameter conflict first
DROP FUNCTION IF EXISTS public.can_access_communication_data(uuid,uuid);

-- ==========================================
-- PHASE 1: CRITICAL SECURITY HARDENING  
-- ==========================================

-- 1. Enhanced Gmail Credentials Security
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
BEGIN
  IF accessing_user_id IS NULL THEN
    PERFORM public.log_security_event(
      'unauthenticated_gmail_access_attempt',
      'critical',
      jsonb_build_object('target_user_id', target_user_id)
    );
    RETURN false;
  END IF;
  
  IF accessing_user_id = target_user_id THEN
    PERFORM public.log_security_event(
      'gmail_credentials_accessed',
      'low',
      jsonb_build_object('user_id', target_user_id, 'legitimate_access', true)
    );
    RETURN true;
  END IF;
  
  PERFORM public.log_security_event(
    'unauthorized_gmail_access_attempt',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'violation_type', 'cross_user_access'
    )
  );
  
  RETURN false;
END;
$$;

-- 2. Enhanced Communication Data Access Control
CREATE OR REPLACE FUNCTION public.can_access_communication_data(target_user_id uuid, target_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
BEGIN
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  IF user_role IN ('supervisor', 'manager', 'admin') THEN
    PERFORM public.log_security_event(
      'supervisor_communication_access',
      'medium',
      jsonb_build_object(
        'supervisor_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', target_client_id,
        'supervisor_role', user_role
      )
    );
    RETURN true;
  END IF;
  
  PERFORM public.log_security_event(
    'unauthorized_communication_access',
    'high',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'client_id', target_client_id
    )
  );
  
  RETURN false;
END;
$$;

-- ==========================================
-- PHASE 2: DATABASE FUNCTION SECURITY
-- ==========================================

-- 3. Enhanced Rate Limiting with Search Path Security
CREATE OR REPLACE FUNCTION public.advanced_rate_limit_check(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start timestamp with time zone;
  result jsonb;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  SELECT COUNT(*) INTO current_count
  FROM security_events
  WHERE user_id = p_user_id
  AND event_type = 'api_request'
  AND details->>'endpoint' = p_endpoint
  AND timestamp > window_start;
  
  IF current_count >= p_max_requests THEN
    PERFORM log_security_event(
      'advanced_rate_limit_exceeded',
      'high',
      jsonb_build_object(
        'endpoint', p_endpoint,
        'current_count', current_count,
        'max_requests', p_max_requests
      )
    );
    
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'current_count', current_count,
      'limit', p_max_requests
    );
  ELSE
    PERFORM log_security_event(
      'api_request',
      'low',
      jsonb_build_object('endpoint', p_endpoint)
    );
    
    result := jsonb_build_object(
      'allowed', true,
      'current_count', current_count,
      'limit', p_max_requests,
      'remaining', p_max_requests - current_count
    );
  END IF;
  
  RETURN result;
END;
$$;

-- ==========================================
-- PHASE 3: ENHANCED SECURITY POLICIES
-- ==========================================

-- 4. Update email_exchanges RLS for communication security
DROP POLICY IF EXISTS "Users can view their own email exchanges" ON public.email_exchanges;
DROP POLICY IF EXISTS "Enhanced email exchanges access" ON public.email_exchanges;
CREATE POLICY "Enhanced email exchanges access"
ON public.email_exchanges
FOR SELECT
USING (
  can_access_communication_data(
    user_id,
    COALESCE(
      (metadata->>'client_id')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  )
);

-- 5. Update quotes RLS for financial data security  
DROP POLICY IF EXISTS "Users can access their own quotes only" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes access with role validation" ON public.quotes;
CREATE POLICY "Enhanced quotes access with role validation"
ON public.quotes
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR
  (
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- ==========================================
-- PHASE 4: SECURITY MONITORING
-- ==========================================

-- 6. Comprehensive Security Dashboard
CREATE OR REPLACE FUNCTION public.get_security_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  metrics jsonb;
  threat_level text;
  critical_events integer;
  high_events integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required' USING ERRCODE = '42501';
  END IF;
  
  SELECT 
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE severity = 'high') as high_count
  INTO critical_events, high_events
  FROM security_events
  WHERE timestamp > now() - INTERVAL '24 hours';
  
  threat_level := CASE
    WHEN critical_events > 0 THEN 'critical'
    WHEN high_events > 5 THEN 'high'
    WHEN high_events > 0 THEN 'medium'
    ELSE 'low'
  END;
  
  metrics := jsonb_build_object(
    'threat_level', threat_level,
    'security_events_24h', jsonb_build_object(
      'critical', critical_events,
      'high', high_events,
      'total', critical_events + high_events
    ),
    'last_updated', now(),
    'security_status', CASE
      WHEN threat_level = 'critical' THEN 'immediate_attention_required'
      WHEN threat_level = 'high' THEN 'monitoring_required'
      WHEN threat_level = 'medium' THEN 'normal_vigilance'
      ELSE 'secure'
    END
  );
  
  PERFORM log_security_event(
    'security_dashboard_accessed',
    'low',
    jsonb_build_object('metrics_generated', true)
  );
  
  RETURN metrics;
END;
$$;