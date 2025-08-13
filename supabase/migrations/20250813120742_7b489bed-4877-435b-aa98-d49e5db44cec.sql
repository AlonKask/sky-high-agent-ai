-- ===============================================
-- COMPREHENSIVE SECURITY REMEDIATION MIGRATION
-- Addresses 5 critical security findings from scan
-- ===============================================

-- ===========================================
-- 1. ENHANCED CLIENT DATA PROTECTION
-- ===========================================

-- Create enhanced client access control function with team hierarchy validation
CREATE OR REPLACE FUNCTION public.can_access_client_data_enhanced(target_user_id uuid, client_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  client_owner_id uuid;
  is_direct_team_member boolean := false;
  is_same_team boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Allow users to access their own client data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;

  -- Get client owner if client_id provided
  IF client_id IS NOT NULL THEN
    SELECT user_id INTO client_owner_id FROM public.clients WHERE id = client_id;
    IF client_owner_id IS NULL THEN
      RETURN false;
    END IF;
    
    -- Only allow access if requesting access to actual owner's data
    IF target_user_id != client_owner_id THEN
      PERFORM public.log_security_event(
        'unauthorized_client_access_attempt',
        'high',
        jsonb_build_object(
          'accessing_user_id', accessing_user_id,
          'target_user_id', target_user_id,
          'client_id', client_id,
          'client_owner_id', client_owner_id,
          'reason', 'target_user_mismatch'
        )
      );
      RETURN false;
    END IF;
  END IF;
  
  -- Get the accessing user's role
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  -- For managers: Only allow access to direct team members' clients
  IF user_role = 'manager' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      PERFORM public.log_security_event(
        'manager_team_client_access',
        'medium',
        jsonb_build_object(
          'manager_id', accessing_user_id,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'justification', 'manager_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For supervisors: Only allow access to team members in same teams
  IF user_role = 'supervisor' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = accessing_user_id
      AND tm2.user_id = target_user_id
    ) INTO is_same_team;
    
    IF is_same_team THEN
      PERFORM public.log_security_event(
        'supervisor_team_client_access',
        'medium',
        jsonb_build_object(
          'supervisor_id', accessing_user_id,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'justification', 'supervisor_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: Log high-severity access but allow with justification requirement
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_client_data_access',
      'critical',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id,
        'access_reason', 'admin_override',
        'requires_justification', true,
        'timestamp', now()
      )
    );
    RETURN true;
  END IF;
  
  -- Deny all other access
  PERFORM public.log_security_event(
    'unauthorized_client_access_denied',
    'high',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'client_id', client_id,
      'user_role', user_role,
      'denial_reason', 'insufficient_privileges'
    )
  );
  
  RETURN false;
END;
$$;

-- Update clients table RLS policies with enhanced security
DROP POLICY IF EXISTS "Secure clients SELECT - principle of least privilege" ON public.clients;
DROP POLICY IF EXISTS "Secure clients UPDATE - principle of least privilege" ON public.clients;

CREATE POLICY "Enhanced clients SELECT - strict access control"
ON public.clients
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND can_access_client_data_enhanced(user_id, id)
);

CREATE POLICY "Enhanced clients UPDATE - owner and authorized only"
ON public.clients
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR can_access_client_data_enhanced(user_id, id)
  )
)
WITH CHECK (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ===========================================
-- 2. FINANCIAL DATA PROTECTION (QUOTES TABLE)
-- ===========================================

-- Create quotes table if it doesn't exist (for completeness)
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid,
  request_id uuid,
  net_price numeric,
  markup numeric,
  total_price numeric,
  commission numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  quote_data jsonb DEFAULT '{}',
  status text DEFAULT 'draft',
  pricing_breakdown jsonb DEFAULT '{}'
);

-- Enable RLS on quotes if not already enabled
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Create financial data access control function
CREATE OR REPLACE FUNCTION public.can_access_financial_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_team_member boolean := false;
BEGIN
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can access their own financial data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  -- Managers can access their team members' data
  IF user_role IN ('manager', 'supervisor') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE (t.manager_id = accessing_user_id OR tm.user_id = accessing_user_id)
      AND tm.user_id = target_user_id
    ) INTO is_team_member;
    
    IF is_team_member THEN
      PERFORM public.log_security_event(
        'financial_data_access',
        'medium',
        jsonb_build_object(
          'accessing_user_id', accessing_user_id,
          'target_user_id', target_user_id,
          'role', user_role,
          'reason', 'team_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- Admins need explicit logging
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_financial_access',
      'high',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'requires_justification', true
      )
    );
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Drop existing quotes policies if they exist
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;

-- Create enhanced quotes RLS policies
CREATE POLICY "Enhanced quotes SELECT - financial data protection"
ON public.quotes
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND can_access_financial_data(user_id)
);

CREATE POLICY "Enhanced quotes INSERT - owner only"
ON public.quotes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "Enhanced quotes UPDATE - restricted access"
ON public.quotes
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ===========================================
-- 3. GMAIL CREDENTIALS ENHANCED SECURITY
-- ===========================================

-- Create enhanced Gmail credentials access function
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  session_valid boolean := false;
BEGIN
  -- Strict authentication check
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Only allow access to own credentials
  IF accessing_user_id != target_user_id THEN
    PERFORM public.log_security_event(
      'gmail_credentials_unauthorized_access',
      'critical',
      jsonb_build_object(
        'accessing_user_id', accessing_user_id,
        'target_user_id', target_user_id,
        'threat_level', 'high'
      )
    );
    RETURN false;
  END IF;
  
  -- Validate session is still active
  SELECT EXISTS(
    SELECT 1 FROM public.user_sessions 
    WHERE user_id = accessing_user_id 
    AND is_active = true 
    AND expires_at > now()
  ) INTO session_valid;
  
  IF NOT session_valid THEN
    PERFORM public.log_security_event(
      'gmail_access_invalid_session',
      'high',
      jsonb_build_object(
        'user_id', accessing_user_id,
        'reason', 'expired_or_inactive_session'
      )
    );
    RETURN false;
  END IF;
  
  -- Log legitimate access
  PERFORM public.log_security_event(
    'gmail_credentials_accessed',
    'low',
    jsonb_build_object(
      'user_id', accessing_user_id,
      'access_type', 'legitimate'
    )
  );
  
  RETURN true;
END;
$$;

-- Update Gmail credentials RLS policies
DROP POLICY IF EXISTS "Authenticated users: gmail SELECT" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Authenticated users: gmail UPDATE" ON public.gmail_credentials;

CREATE POLICY "Enhanced gmail SELECT - strict owner only"
ON public.gmail_credentials
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND can_access_gmail_credentials_enhanced(user_id)
);

CREATE POLICY "Enhanced gmail UPDATE - strict owner only"
ON public.gmail_credentials
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND can_access_gmail_credentials_enhanced(user_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- ===========================================
-- 4. SESSION SECURITY ENHANCEMENT
-- ===========================================

-- Create enhanced session validation function
CREATE OR REPLACE FUNCTION public.validate_session_access(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  ip_match boolean := false;
BEGIN
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can only access their own sessions
  IF accessing_user_id != target_user_id THEN
    SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
    
    -- Only admins can access other users' sessions (with logging)
    IF user_role = 'admin' THEN
      PERFORM public.log_security_event(
        'admin_session_access',
        'critical',
        jsonb_build_object(
          'admin_id', accessing_user_id,
          'target_user_id', target_user_id,
          'requires_justification', true
        )
      );
      RETURN true;
    END IF;
    
    PERFORM public.log_security_event(
      'unauthorized_session_access',
      'critical',
      jsonb_build_object(
        'accessing_user_id', accessing_user_id,
        'target_user_id', target_user_id
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Update user_sessions RLS policies
DROP POLICY IF EXISTS "Authenticated users: sessions SELECT" ON public.user_sessions;

CREATE POLICY "Enhanced sessions SELECT - strict validation"
ON public.user_sessions
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND validate_session_access(user_id)
);

-- ===========================================
-- 5. COMMUNICATION DATA PROTECTION
-- ===========================================

-- Create communication access control function
CREATE OR REPLACE FUNCTION public.can_access_communication_data(target_user_id uuid, client_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_authorized boolean := false;
BEGIN
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can access their own communications
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = accessing_user_id;
  
  -- Supervisors and managers can access team communications with restrictions
  IF user_role IN ('supervisor', 'manager') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE (t.manager_id = accessing_user_id OR tm.user_id = accessing_user_id)
      AND tm.user_id = target_user_id
    ) INTO is_authorized;
    
    IF is_authorized THEN
      PERFORM public.log_security_event(
        'communication_oversight_access',
        'medium',
        jsonb_build_object(
          'supervisor_id', accessing_user_id,
          'target_user_id', target_user_id,
          'client_id', client_id,
          'role', user_role,
          'justification', 'team_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- Admins require high-level logging
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_communication_access',
      'high',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id,
        'requires_justification', true
      )
    );
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Update email_exchanges RLS policies
DROP POLICY IF EXISTS "Authenticated users: emails SELECT" ON public.email_exchanges;
DROP POLICY IF EXISTS "Authenticated users: emails UPDATE" ON public.email_exchanges;

CREATE POLICY "Enhanced emails SELECT - communication protection"
ON public.email_exchanges
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND can_access_communication_data(user_id, client_id)
);

CREATE POLICY "Enhanced emails UPDATE - restricted access"
ON public.email_exchanges
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'supervisor'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  auth.uid() = user_id
);

-- Update agent_client_chat RLS policies
DROP POLICY IF EXISTS "Secure chat access" ON public.agent_client_chat;

CREATE POLICY "Enhanced chat SELECT - communication protection"
ON public.agent_client_chat
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND can_access_communication_data(user_id, client_id)
);

CREATE POLICY "Enhanced chat INSERT - owner only"
ON public.agent_client_chat
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "Enhanced chat UPDATE - owner only"
ON public.agent_client_chat
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- ===========================================
-- 6. ADDITIONAL SECURITY MEASURES
-- ===========================================

-- Create function to check for suspicious activity patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_failures integer;
  user_role app_role;
BEGIN
  -- Check for multiple failed access attempts
  SELECT COUNT(*) INTO recent_failures
  FROM public.security_events
  WHERE user_id = NEW.user_id
  AND event_type IN ('unauthorized_client_access_denied', 'unauthorized_session_access', 'gmail_credentials_unauthorized_access')
  AND timestamp > now() - INTERVAL '5 minutes';
  
  IF recent_failures >= 3 THEN
    -- Log critical security event
    INSERT INTO public.security_events (user_id, event_type, severity, details)
    VALUES (
      NEW.user_id,
      'suspicious_activity_detected',
      'critical',
      jsonb_build_object(
        'pattern', 'multiple_unauthorized_attempts',
        'attempts_in_5min', recent_failures,
        'requires_investigation', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for suspicious activity detection
DROP TRIGGER IF EXISTS detect_suspicious_activity_trigger ON public.security_events;
CREATE TRIGGER detect_suspicious_activity_trigger
  AFTER INSERT ON public.security_events
  FOR EACH ROW
  WHEN (NEW.event_type IN ('unauthorized_client_access_denied', 'unauthorized_session_access', 'gmail_credentials_unauthorized_access'))
  EXECUTE FUNCTION public.detect_suspicious_activity();

-- Create automatic session cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark expired sessions as inactive
  UPDATE public.user_sessions
  SET is_active = false
  WHERE expires_at < now() AND is_active = true;
  
  -- Log cleanup action
  INSERT INTO public.security_events (event_type, severity, details)
  VALUES (
    'session_cleanup_performed',
    'low',
    jsonb_build_object(
      'cleanup_time', now(),
      'expired_sessions_found', (SELECT COUNT(*) FROM public.user_sessions WHERE expires_at < now() AND is_active = false)
    )
  );
END;
$$;

-- ===========================================
-- 7. AUDIT AND COMPLIANCE ENHANCEMENTS
-- ===========================================

-- Create comprehensive access audit function
CREATE OR REPLACE FUNCTION public.audit_data_access(
  p_table_name text,
  p_operation text,
  p_record_id uuid,
  p_data_classification text DEFAULT 'confidential'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all access to sensitive data
  INSERT INTO public.security_events (
    user_id, event_type, severity, details
  ) VALUES (
    auth.uid(),
    'sensitive_data_accessed',
    CASE 
      WHEN p_data_classification = 'secret' THEN 'high'
      WHEN p_data_classification = 'confidential' THEN 'medium'
      ELSE 'low'
    END,
    jsonb_build_object(
      'table_name', p_table_name,
      'operation', p_operation,
      'record_id', p_record_id,
      'data_classification', p_data_classification,
      'requires_review', p_data_classification IN ('secret', 'confidential')
    )
  );
END;
$$;

-- Success logging
DO $$
BEGIN
  PERFORM public.log_security_event(
    'security_remediation_completed',
    'low',
    jsonb_build_object(
      'migration_timestamp', now(),
      'fixes_applied', 7,
      'tables_secured', ARRAY['clients', 'quotes', 'gmail_credentials', 'user_sessions', 'email_exchanges', 'agent_client_chat'],
      'status', 'comprehensive_security_enhancement_complete'
    )
  );
END $$;