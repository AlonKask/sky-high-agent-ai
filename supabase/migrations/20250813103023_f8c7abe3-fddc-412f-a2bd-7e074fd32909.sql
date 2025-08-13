-- COMPREHENSIVE SECURITY OVERHAUL: Fix All Critical Vulnerabilities (Fixed Version)
-- Phase 1: Drop ALL existing problematic RLS policies

-- Drop existing policies on critical tables
DROP POLICY IF EXISTS "Secure client data access" ON public.clients;
DROP POLICY IF EXISTS "Strict profile access control" ON public.profiles;
DROP POLICY IF EXISTS "Users can modify own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Secure gmail credentials access" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Secure communication access" ON public.email_exchanges;
DROP POLICY IF EXISTS "Secure request access" ON public.requests;
DROP POLICY IF EXISTS "Secure session access" ON public.user_sessions;
DROP POLICY IF EXISTS "System session cleanup" ON public.user_sessions;
DROP POLICY IF EXISTS "System session management" ON public.user_sessions;
DROP POLICY IF EXISTS "System session updates" ON public.user_sessions;

-- Phase 2: Create secure access functions with proper null handling
CREATE OR REPLACE FUNCTION public.can_access_financial_data(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN auth.uid() IS NULL THEN false
      WHEN target_user_id IS NULL THEN false
      ELSE (
        auth.uid() = target_user_id
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() 
          AND ur.role IN ('admin', 'manager')
        )
      )
    END;
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Phase 3: Create RESTRICTIVE policies that DENY anonymous access
CREATE POLICY "DENY all anonymous access to clients"
ON public.clients
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

CREATE POLICY "DENY all anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

CREATE POLICY "DENY all anonymous access to gmail_credentials"
ON public.gmail_credentials
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

CREATE POLICY "DENY all anonymous access to email_exchanges"
ON public.email_exchanges
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

CREATE POLICY "DENY all anonymous access to quotes"
ON public.quotes
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

CREATE POLICY "DENY all anonymous access to requests"
ON public.requests
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

CREATE POLICY "DENY all anonymous access to user_sessions"
ON public.user_sessions
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Phase 4: Create AUTHENTICATED-ONLY policies with proper access control

-- CLIENTS table - Most restrictive
CREATE POLICY "Authenticated users: clients SELECT"
ON public.clients
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND can_access_client_data(user_id)
);

CREATE POLICY "Authenticated users: clients INSERT"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "Authenticated users: clients UPDATE"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND can_access_client_data(user_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "Authenticated users: clients DELETE"
ON public.clients
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- PROFILES table - User can only access own profile
CREATE POLICY "Authenticated users: profiles SELECT"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

CREATE POLICY "Authenticated users: profiles INSERT"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

CREATE POLICY "Authenticated users: profiles UPDATE"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- GMAIL_CREDENTIALS table - Highly sensitive
CREATE POLICY "Authenticated users: gmail SELECT"
ON public.gmail_credentials
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "Authenticated users: gmail INSERT"
ON public.gmail_credentials
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "Authenticated users: gmail UPDATE"
ON public.gmail_credentials
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "Authenticated users: gmail DELETE"
ON public.gmail_credentials
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- EMAIL_EXCHANGES table - Communication data
CREATE POLICY "Authenticated users: emails SELECT"
ON public.email_exchanges
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "Authenticated users: emails INSERT"
ON public.email_exchanges
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "Authenticated users: emails UPDATE"
ON public.email_exchanges
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- QUOTES table - Financial data
CREATE POLICY "Authenticated users: quotes SELECT"
ON public.quotes
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND can_access_financial_data(user_id)
);

CREATE POLICY "Authenticated users: quotes INSERT"
ON public.quotes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "Authenticated users: quotes UPDATE"
ON public.quotes
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND can_access_financial_data(user_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- REQUESTS table - Business data
CREATE POLICY "Authenticated users: requests SELECT"
ON public.requests
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'supervisor'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Authenticated users: requests INSERT"
ON public.requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "Authenticated users: requests UPDATE"
ON public.requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'supervisor'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- USER_SESSIONS table - Session management (system only)
CREATE POLICY "Authenticated users: sessions SELECT"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Phase 5: Update existing access control functions
CREATE OR REPLACE FUNCTION public.can_access_client_data(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN auth.uid() IS NULL THEN false
      WHEN target_user_id IS NULL THEN false
      ELSE (
        -- Users can only access their own client data
        auth.uid() = target_user_id
        OR EXISTS (
          -- Team managers can access their team members' client data (audited)
          SELECT 1 FROM public.teams t
          JOIN public.team_members tm ON t.id = tm.team_id 
          WHERE tm.user_id = target_user_id
          AND t.manager_id = auth.uid()
        )
        OR EXISTS (
          -- Admin access (heavily audited)
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() 
          AND ur.role = 'admin'
        )
      )
    END;
$$;

-- Phase 6: Add comprehensive access logging
CREATE OR REPLACE FUNCTION public.log_sensitive_table_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log any access to sensitive tables
  INSERT INTO public.security_events (
    user_id, event_type, severity, details
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'sensitive_table_access',
    CASE 
      WHEN auth.uid() IS NULL THEN 'critical'
      ELSE 'low'
    END,
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'authenticated', auth.uid() IS NOT NULL,
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply logging triggers to critical tables
DROP TRIGGER IF EXISTS log_clients_access ON public.clients;
CREATE TRIGGER log_clients_access
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_table_access();

DROP TRIGGER IF EXISTS log_gmail_credentials_access ON public.gmail_credentials;
CREATE TRIGGER log_gmail_credentials_access
  AFTER INSERT OR UPDATE OR DELETE ON public.gmail_credentials
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_table_access();