-- ===============================================
-- SECURITY FIX: CORRECT RLS ROLE ASSIGNMENT
-- Fix policies to use 'authenticated' role instead of 'public'
-- ===============================================

-- ===========================================
-- 1. FIX CLIENTS TABLE POLICIES
-- ===========================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enhanced clients SELECT - strict access control" ON public.clients;
DROP POLICY IF EXISTS "Enhanced clients UPDATE - owner and authorized only" ON public.clients;

-- Create corrected policies for authenticated users only
CREATE POLICY "Enhanced clients SELECT - strict access control"
ON public.clients
FOR SELECT
TO authenticated
USING (can_access_client_data_enhanced(user_id, id));

CREATE POLICY "Enhanced clients UPDATE - owner and authorized only"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id) OR can_access_client_data_enhanced(user_id, id)
)
WITH CHECK (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ===========================================
-- 2. FIX GMAIL CREDENTIALS POLICIES
-- ===========================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enhanced gmail SELECT - strict owner only" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Enhanced gmail UPDATE - strict owner only" ON public.gmail_credentials;

-- Create corrected policies for authenticated users only
CREATE POLICY "Enhanced gmail SELECT - strict owner only"
ON public.gmail_credentials
FOR SELECT
TO authenticated
USING (can_access_gmail_credentials_enhanced(user_id));

CREATE POLICY "Enhanced gmail UPDATE - strict owner only"
ON public.gmail_credentials
FOR UPDATE
TO authenticated
USING (can_access_gmail_credentials_enhanced(user_id))
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 3. FIX USER SESSIONS POLICIES
-- ===========================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enhanced sessions SELECT - strict validation" ON public.user_sessions;

-- Create corrected policies for authenticated users only
CREATE POLICY "Enhanced sessions SELECT - strict validation"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (validate_session_access(user_id));

-- ===========================================
-- 4. FIX QUOTES TABLE POLICIES
-- ===========================================

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Enhanced quotes SELECT - financial data protection" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes INSERT - owner only" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes UPDATE - restricted access" ON public.quotes;

-- Create corrected policies for authenticated users only
CREATE POLICY "Enhanced quotes SELECT - financial data protection"
ON public.quotes
FOR SELECT
TO authenticated
USING (can_access_financial_data(user_id));

CREATE POLICY "Enhanced quotes INSERT - owner only"
ON public.quotes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enhanced quotes UPDATE - restricted access"
ON public.quotes
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ===========================================
-- 5. FIX EMAIL EXCHANGES POLICIES
-- ===========================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enhanced emails SELECT - communication protection" ON public.email_exchanges;
DROP POLICY IF EXISTS "Enhanced emails UPDATE - restricted access" ON public.email_exchanges;

-- Create corrected policies for authenticated users only
CREATE POLICY "Enhanced emails SELECT - communication protection"
ON public.email_exchanges
FOR SELECT
TO authenticated
USING (can_access_communication_data(user_id, client_id));

CREATE POLICY "Enhanced emails UPDATE - restricted access"
ON public.email_exchanges
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 6. FIX AGENT CLIENT CHAT POLICIES
-- ===========================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enhanced chat SELECT - communication protection" ON public.agent_client_chat;
DROP POLICY IF EXISTS "Enhanced chat INSERT - owner only" ON public.agent_client_chat;
DROP POLICY IF EXISTS "Enhanced chat UPDATE - owner only" ON public.agent_client_chat;

-- Create corrected policies for authenticated users only
CREATE POLICY "Enhanced chat SELECT - communication protection"
ON public.agent_client_chat
FOR SELECT
TO authenticated
USING (can_access_communication_data(user_id, client_id));

CREATE POLICY "Enhanced chat INSERT - owner only"
ON public.agent_client_chat
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enhanced chat UPDATE - owner only"
ON public.agent_client_chat
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 7. STRENGTHEN DENIAL POLICIES
-- ===========================================

-- Ensure all sensitive tables have explicit DENY policies for public/anonymous
-- These policies are already in place but let's make sure they're restrictive

-- Update existing DENY policies to be more explicit
DROP POLICY IF EXISTS "DENY all anonymous access to clients" ON public.clients;
CREATE POLICY "DENY all anonymous access to clients"
ON public.clients
TO public
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "DENY all anonymous access to gmail_credentials" ON public.gmail_credentials;
CREATE POLICY "DENY all anonymous access to gmail_credentials"
ON public.gmail_credentials
TO public
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "DENY all anonymous access to user_sessions" ON public.user_sessions;
CREATE POLICY "DENY all anonymous access to user_sessions"
ON public.user_sessions
TO public
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "DENY all anonymous access to email_exchanges" ON public.email_exchanges;
CREATE POLICY "DENY all anonymous access to email_exchanges"
ON public.email_exchanges
TO public
USING (false)
WITH CHECK (false);

-- Add DENY policies for any missing sensitive tables
CREATE POLICY "DENY all anonymous access to quotes"
ON public.quotes
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "DENY all anonymous access to agent_client_chat"
ON public.agent_client_chat
TO public
USING (false)
WITH CHECK (false);

-- ===========================================
-- 8. UPDATE SECURITY FUNCTIONS (OPTIMIZATION)
-- ===========================================

-- Update security functions to remove redundant auth.uid() IS NOT NULL checks
-- since authenticated role guarantees this

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
  -- auth.uid() is guaranteed to be NOT NULL for authenticated role
  IF target_user_id IS NULL THEN
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
        'suspicious_activity',
        'high',
        jsonb_build_object(
          'event_subtype', 'unauthorized_client_access_attempt',
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
        'admin_action',
        'medium',
        jsonb_build_object(
          'event_subtype', 'manager_team_client_access',
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
        'admin_action',
        'medium',
        jsonb_build_object(
          'event_subtype', 'supervisor_team_client_access',
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
      'admin_action',
      'critical',
      jsonb_build_object(
        'event_subtype', 'admin_client_data_access',
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
    'failed_authorization',
    'high',
    jsonb_build_object(
      'event_subtype', 'unauthorized_client_access_denied',
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

CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  session_valid boolean := false;
BEGIN
  -- auth.uid() is guaranteed to be NOT NULL for authenticated role
  IF target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Only allow access to own credentials
  IF accessing_user_id != target_user_id THEN
    PERFORM public.log_security_event(
      'suspicious_activity',
      'critical',
      jsonb_build_object(
        'event_subtype', 'gmail_credentials_unauthorized_access',
        'accessing_user_id', accessing_user_id,
        'target_user_id', target_user_id,
        'threat_level', 'high'
      )
    );
    RETURN false;
  END IF;
  
  -- Validate session is still active (if sessions table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_sessions 
      WHERE user_id = accessing_user_id 
      AND is_active = true 
      AND expires_at > now()
    ) INTO session_valid;
    
    IF NOT session_valid THEN
      PERFORM public.log_security_event(
        'suspicious_activity',
        'high',
        jsonb_build_object(
          'event_subtype', 'gmail_access_invalid_session',
          'user_id', accessing_user_id,
          'reason', 'expired_or_inactive_session'
        )
      );
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;