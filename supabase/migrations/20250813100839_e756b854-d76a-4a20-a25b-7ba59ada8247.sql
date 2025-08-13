-- FIX SECURITY LINTER WARNINGS: Set search_path for all functions
-- This addresses the "Function Search Path Mutable" security warnings

-- 1. Fix can_access_financial_data function
CREATE OR REPLACE FUNCTION public.can_access_financial_data(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Users can only access their own financial data
    auth.uid() = target_user_id
    OR EXISTS (
      -- Team managers can access their team members' data
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id 
      WHERE tm.user_id = target_user_id
      AND t.manager_id = auth.uid()
    )
    OR EXISTS (
      -- Admins have audited access
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    );
$$;

-- 2. Fix audit_gmail_credentials_access function
CREATE OR REPLACE FUNCTION public.audit_gmail_credentials_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, severity, details
  ) VALUES (
    auth.uid(),
    'gmail_credentials_accessed',
    'high',
    jsonb_build_object(
      'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
      'operation', TG_OP,
      'has_encrypted_tokens', (COALESCE(NEW.access_token_encrypted, OLD.access_token_encrypted) IS NOT NULL),
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 3. Fix rotate_gmail_tokens function
CREATE OR REPLACE FUNCTION public.rotate_gmail_tokens(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    PERFORM public.log_security_event(
      'unauthorized_token_rotation_attempt',
      'critical',
      jsonb_build_object('target_user_id', p_user_id)
    );
    RETURN false;
  END IF;
  
  UPDATE public.gmail_credentials 
  SET updated_at = now()
  WHERE user_id = p_user_id;
  
  PERFORM public.log_security_event(
    'gmail_token_rotation_requested',
    'medium',
    jsonb_build_object('user_id', p_user_id)
  );
  
  RETURN true;
END;
$$;

-- 4. Fix get_security_dashboard_metrics function
CREATE OR REPLACE FUNCTION public.get_security_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  metrics jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized access to security dashboard';
  END IF;
  
  SELECT jsonb_build_object(
    'critical_events_24h', (
      SELECT COUNT(*) FROM public.security_events 
      WHERE severity = 'critical' AND timestamp > now() - interval '24 hours'
    ),
    'high_events_24h', (
      SELECT COUNT(*) FROM public.security_events 
      WHERE severity = 'high' AND timestamp > now() - interval '24 hours'
    ),
    'failed_access_attempts_24h', (
      SELECT COUNT(*) FROM public.security_events 
      WHERE event_type LIKE '%unauthorized%' AND timestamp > now() - interval '24 hours'
    ),
    'encrypted_clients_count', (
      SELECT COUNT(*) FROM public.clients 
      WHERE encrypted_ssn IS NOT NULL OR encrypted_passport_number IS NOT NULL OR encrypted_payment_info IS NOT NULL
    ),
    'active_gmail_integrations', (
      SELECT COUNT(*) FROM public.gmail_credentials 
      WHERE access_token_encrypted IS NOT NULL
    ),
    'total_security_events_7d', (
      SELECT COUNT(*) FROM public.security_events 
      WHERE timestamp > now() - interval '7 days'
    ),
    'scan_timestamp', now()
  ) INTO metrics;
  
  PERFORM public.log_security_event(
    'security_dashboard_accessed',
    'low',
    jsonb_build_object('admin_user_id', auth.uid())
  );
  
  RETURN metrics;
END;
$$;

-- Log security linter fixes completion
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  auth.uid(),
  'security_enhancement_applied',
  'low',
  jsonb_build_object(
    'enhancement_phase', 'Security Linter Fixes Applied',
    'fixes_applied', jsonb_build_array(
      'Fixed search_path mutable warnings for all security functions',
      'Applied proper search_path constraints to all database functions',
      'Enhanced function security with explicit schema references'
    ),
    'timestamp', now()
  )
);