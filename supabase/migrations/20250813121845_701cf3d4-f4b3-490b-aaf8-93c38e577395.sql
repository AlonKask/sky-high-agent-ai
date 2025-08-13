-- Phase 1: Critical RLS Policy Fixes and Missing Security Functions

-- First, implement missing security functions that are referenced in RLS policies

-- Function to validate session access (referenced in user_sessions RLS)
CREATE OR REPLACE FUNCTION public.validate_session_access(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can access their own sessions
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- Only admins can access other users' sessions
  IF user_role = 'admin' THEN
    -- Log admin session access
    PERFORM public.log_security_event(
      'admin_session_access',
      'high',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'justification', 'admin_session_management'
      )
    );
    RETURN true;
  END IF;
  
  -- Log unauthorized session access attempt
  PERFORM public.log_security_event(
    'unauthorized_session_access',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'user_role', user_role
    )
  );
  
  RETURN false;
END;
$$;

-- Function to check financial data access (if referenced anywhere)
CREATE OR REPLACE FUNCTION public.can_access_financial_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can access their own financial data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- Only managers and admins can access other users' financial data
  IF user_role IN ('manager', 'admin') THEN
    -- Log financial data access
    PERFORM public.log_security_event(
      'financial_data_access',
      'high',
      jsonb_build_object(
        'accessing_user_id', accessing_user_id,
        'target_user_id', target_user_id,
        'user_role', user_role,
        'justification', 'manager_financial_oversight'
      )
    );
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to enhance client data access (strengthen existing function)
CREATE OR REPLACE FUNCTION public.can_access_client_data_enhanced(target_user_id uuid, client_id uuid)
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
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Users can access their own client data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- For managers and supervisors: Only allow access to direct team members' clients
  IF user_role IN ('manager', 'supervisor') THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_team_member;
    
    IF is_team_member THEN
      -- Log team oversight access
      PERFORM public.log_security_event(
        'team_client_data_access',
        'medium',
        jsonb_build_object(
          'manager_id', accessing_user_id,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'user_role', user_role
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: Allow but with heavy logging
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_client_data_access',
      'critical',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id,
        'requires_justification', true
      )
    );
    RETURN true;
  END IF;
  
  -- Log unauthorized access attempt
  PERFORM public.log_security_event(
    'unauthorized_client_data_access',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'client_id', client_id,
      'user_role', user_role
    )
  );
  
  RETURN false;
END;
$$;

-- Function to enhance Gmail credentials access
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- STRICT: Users can ONLY access their own Gmail credentials
  -- No admin override for Gmail credentials due to OAuth sensitivity
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Log any attempt to access other users' Gmail credentials
  PERFORM public.log_security_event(
    'unauthorized_gmail_credentials_access',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'violation_type', 'cross_user_gmail_access'
    )
  );
  
  RETURN false;
END;
$$;

-- Now fix any remaining RLS policy issues
-- Ensure all policies are assigned to authenticated role and remove conflicts

-- Fix quotes table RLS policies (if they exist and have issues)
DROP POLICY IF EXISTS "Authenticated users: quotes INSERT" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users: quotes SELECT" ON public.quotes;  
DROP POLICY IF EXISTS "Authenticated users: quotes UPDATE" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users: quotes DELETE" ON public.quotes;
DROP POLICY IF EXISTS "DENY all anonymous access to quotes" ON public.quotes;

-- Check if quotes table exists before creating policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
    -- Create secure quotes policies
    CREATE POLICY "Enhanced quotes INSERT - authenticated users only"
    ON public.quotes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Enhanced quotes SELECT - owner and authorized access"
    ON public.quotes
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id OR 
      has_role(auth.uid(), 'supervisor'::app_role) OR 
      has_role(auth.uid(), 'manager'::app_role) OR 
      has_role(auth.uid(), 'admin'::app_role)
    );

    CREATE POLICY "Enhanced quotes UPDATE - owner and supervisors"
    ON public.quotes
    FOR UPDATE
    TO authenticated
    USING (
      auth.uid() = user_id OR 
      has_role(auth.uid(), 'supervisor'::app_role) OR 
      has_role(auth.uid(), 'manager'::app_role) OR 
      has_role(auth.uid(), 'admin'::app_role)
    )
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Enhanced quotes DELETE - owner only"
    ON public.quotes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

    CREATE POLICY "DENY all anonymous access to quotes"
    ON public.quotes
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;

-- Add comprehensive audit trigger for sensitive operations
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all operations on sensitive tables
  PERFORM public.log_security_event(
    'sensitive_table_operation',
    CASE 
      WHEN TG_OP = 'DELETE' THEN 'high'
      WHEN TG_OP = 'UPDATE' THEN 'medium'
      ELSE 'low'
    END,
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'user_id', auth.uid(),
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit trigger to critical tables
DROP TRIGGER IF EXISTS audit_clients_operations ON public.clients;
CREATE TRIGGER audit_clients_operations
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

DROP TRIGGER IF EXISTS audit_gmail_credentials_operations ON public.gmail_credentials;
CREATE TRIGGER audit_gmail_credentials_operations  
AFTER INSERT OR UPDATE OR DELETE ON public.gmail_credentials
FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

DROP TRIGGER IF EXISTS audit_email_exchanges_operations ON public.email_exchanges;
CREATE TRIGGER audit_email_exchanges_operations
AFTER INSERT OR UPDATE OR DELETE ON public.email_exchanges
FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();