-- Phase 1: Critical Security & Database Fixes
-- Fix critical RLS policy for clients table and implement proper role-based access control

-- First, create the missing functions and enums
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('admin', 'manager', 'supervisor', 'gds_expert', 'agent', 'user');

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  );
$$;

-- Create function to check if user can access client data
CREATE OR REPLACE FUNCTION public.can_access_client_data(client_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id UUID := auth.uid();
  client_owner_id UUID;
  user_role app_role;
  is_direct_team_member BOOLEAN := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get client owner
  SELECT user_id INTO client_owner_id
  FROM public.clients
  WHERE id = client_id;
  
  IF client_owner_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Allow users to access their own client data
  IF accessing_user_id = client_owner_id THEN
    RETURN true;
  END IF;
  
  -- Get the accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- For managers/supervisors: Only allow access to direct team members' clients
  IF user_role IN ('manager', 'supervisor') THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = client_owner_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      -- Log access for audit
      PERFORM public.log_security_event(
        'manager_team_client_access',
        'medium',
        jsonb_build_object(
          'manager_id', accessing_user_id,
          'team_member_id', client_owner_id,
          'client_id', client_id,
          'justification', 'manager_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: Allow but with heavy logging
  IF user_role = 'admin' THEN
    -- Log admin access as high severity security event
    PERFORM public.log_security_event(
      'admin_client_data_access',
      'high',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'client_owner_id', client_owner_id,
        'client_id', client_id,
        'access_reason', 'admin_override',
        'requires_justification', true,
        'timestamp', now()
      )
    );
    
    RETURN true;
  END IF;
  
  -- Deny all other access and log attempt
  PERFORM public.log_security_event(
    'unauthorized_client_access_attempt',
    'high',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'client_owner_id', client_owner_id,
      'client_id', client_id,
      'user_role', user_role,
      'denial_reason', 'insufficient_privileges'
    )
  );
  
  RETURN false;
END;
$$;

-- Drop and recreate the clients RLS policy with proper security
DROP POLICY IF EXISTS "Enhanced role-based client access" ON public.clients;

CREATE POLICY "Enhanced secure client access" 
ON public.clients 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND can_access_client_data(id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Create audit trigger for clients table
CREATE OR REPLACE FUNCTION public.audit_client_access()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all operations on client data
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  )
  VALUES (
    auth.uid(),
    'client_data_' || lower(TG_OP),
    CASE TG_OP
      WHEN 'SELECT' THEN 'low'
      WHEN 'INSERT' THEN 'medium'
      WHEN 'UPDATE' THEN 'medium'
      WHEN 'DELETE' THEN 'high'
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'client_id', COALESCE(NEW.id, OLD.id),
      'timestamp', now(),
      'user_authenticated', auth.uid() IS NOT NULL
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for client audit logging
DROP TRIGGER IF EXISTS audit_clients_trigger ON public.clients;
CREATE TRIGGER audit_clients_trigger
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_client_access();

-- Fix other critical tables security
-- Fix quotes table RLS
DROP POLICY IF EXISTS "Secure quotes access" ON public.quotes;
CREATE POLICY "Enhanced secure quotes access" 
ON public.quotes 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Fix gmail_credentials table RLS
DROP POLICY IF EXISTS "Secure gmail credentials access" ON public.gmail_credentials;
CREATE POLICY "Enhanced secure gmail credentials access" 
ON public.gmail_credentials 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Create missing teams and team_members tables if they don't exist
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    manager_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (team_id, user_id)
);

-- Enable RLS on teams tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for teams
CREATE POLICY "Users can view teams they belong to or manage"
ON public.teams
FOR SELECT
USING (
  auth.uid() = manager_id
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = id AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view team members of teams they belong to or manage"
ON public.team_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_id
    AND (
      t.manager_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.team_members tm2
        WHERE tm2.team_id = t.id AND tm2.user_id = auth.uid()
      )
    )
  )
);

-- Create missing request_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.request_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on request_assignments
ALTER TABLE public.request_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for request_assignments
CREATE POLICY "Users can view assignments they are involved in"
ON public.request_assignments
FOR ALL
USING (
  auth.uid() = assigned_to
  OR auth.uid() = assigned_by
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);