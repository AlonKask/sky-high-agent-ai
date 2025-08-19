-- Fix RLS policies to support proper role-based access control
-- This migration fixes overly restrictive policies and implements proper role hierarchy

-- 1. First, create missing helper functions for role-based access
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
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

-- Function to check if user can manage teams
CREATE OR REPLACE FUNCTION public.can_manage_teams(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('admin', 'manager', 'supervisor')
  );
$$;

-- Function to check satisfaction scores access
CREATE OR REPLACE FUNCTION public.can_access_satisfaction_scores(_client_id uuid, _agent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    auth.uid() = _agent_id OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'supervisor');
$$;

-- 2. Update requests table policies to allow proper access
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.requests;

CREATE POLICY "Role-based requests access" ON public.requests
FOR SELECT USING (
  CASE 
    -- Users can only see their own requests
    WHEN public.has_role(auth.uid(), 'user') THEN user_id = auth.uid()
    -- Staff can see all requests (agents, gds_experts, supervisors, managers, admins)
    ELSE public.has_role(auth.uid(), 'agent') OR 
         public.has_role(auth.uid(), 'gds_expert') OR
         public.has_role(auth.uid(), 'supervisor') OR
         public.has_role(auth.uid(), 'manager') OR
         public.has_role(auth.uid(), 'admin')
  END
);

CREATE POLICY "Role-based requests creation" ON public.requests
FOR INSERT WITH CHECK (
  CASE 
    -- Users can create their own requests
    WHEN public.has_role(auth.uid(), 'user') THEN user_id = auth.uid()
    -- Staff can create requests for any user
    ELSE public.has_role(auth.uid(), 'agent') OR 
         public.has_role(auth.uid(), 'gds_expert') OR
         public.has_role(auth.uid(), 'supervisor') OR
         public.has_role(auth.uid(), 'manager') OR
         public.has_role(auth.uid(), 'admin')
  END
);

CREATE POLICY "Role-based requests update" ON public.requests
FOR UPDATE USING (
  CASE 
    -- Users can update their own requests
    WHEN public.has_role(auth.uid(), 'user') THEN user_id = auth.uid()
    -- Staff can update any request
    ELSE public.has_role(auth.uid(), 'agent') OR 
         public.has_role(auth.uid(), 'gds_expert') OR
         public.has_role(auth.uid(), 'supervisor') OR
         public.has_role(auth.uid(), 'manager') OR
         public.has_role(auth.uid(), 'admin')
  END
) WITH CHECK (
  CASE 
    -- Users can update their own requests
    WHEN public.has_role(auth.uid(), 'user') THEN user_id = auth.uid()
    -- Staff can update any request
    ELSE public.has_role(auth.uid(), 'agent') OR 
         public.has_role(auth.uid(), 'gds_expert') OR
         public.has_role(auth.uid(), 'supervisor') OR
         public.has_role(auth.uid(), 'manager') OR
         public.has_role(auth.uid(), 'admin')
  END
);

CREATE POLICY "Role-based requests delete" ON public.requests
FOR DELETE USING (
  CASE 
    -- Users can delete their own requests
    WHEN public.has_role(auth.uid(), 'user') THEN user_id = auth.uid()
    -- Only supervisors and above can delete requests
    ELSE public.has_role(auth.uid(), 'supervisor') OR
         public.has_role(auth.uid(), 'manager') OR
         public.has_role(auth.uid(), 'admin')
  END
);

-- 3. Update clients table policies
DROP POLICY IF EXISTS "Secure clients access" ON public.clients;
DROP POLICY IF EXISTS "Secure clients modification" ON public.clients;
DROP POLICY IF EXISTS "Secure clients update" ON public.clients;
DROP POLICY IF EXISTS "Secure clients delete" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

CREATE POLICY "Role-based clients access" ON public.clients
FOR SELECT USING (
  CASE 
    -- Users can only see their own clients (if they are the agent for that client)
    WHEN public.has_role(auth.uid(), 'user') THEN user_id = auth.uid()
    -- Staff can see all clients they are authorized to work with
    ELSE public.has_role(auth.uid(), 'agent') OR 
         public.has_role(auth.uid(), 'gds_expert') OR
         public.has_role(auth.uid(), 'supervisor') OR
         public.has_role(auth.uid(), 'manager') OR
         public.has_role(auth.uid(), 'admin')
  END
);

CREATE POLICY "Role-based clients creation" ON public.clients
FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'agent') OR 
  public.has_role(auth.uid(), 'gds_expert') OR
  public.has_role(auth.uid(), 'supervisor') OR
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Role-based clients update" ON public.clients
FOR UPDATE USING (
  CASE 
    -- Users can update their own profile if they happen to be a client
    WHEN public.has_role(auth.uid(), 'user') THEN user_id = auth.uid()
    -- Staff can update any client
    ELSE public.has_role(auth.uid(), 'agent') OR 
         public.has_role(auth.uid(), 'gds_expert') OR
         public.has_role(auth.uid(), 'supervisor') OR
         public.has_role(auth.uid(), 'manager') OR
         public.has_role(auth.uid(), 'admin')
  END
) WITH CHECK (
  CASE 
    -- Users can update their own profile if they happen to be a client
    WHEN public.has_role(auth.uid(), 'user') THEN user_id = auth.uid()
    -- Staff can update any client
    ELSE public.has_role(auth.uid(), 'agent') OR 
         public.has_role(auth.uid(), 'gds_expert') OR
         public.has_role(auth.uid(), 'supervisor') OR
         public.has_role(auth.uid(), 'manager') OR
         public.has_role(auth.uid(), 'admin')
  END
);

CREATE POLICY "Role-based clients delete" ON public.clients
FOR DELETE USING (
  public.has_role(auth.uid(), 'supervisor') OR
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin')
);

-- 4. Update bookings table policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete their own bookings" ON public.bookings;

CREATE POLICY "Role-based bookings access" ON public.bookings
FOR SELECT USING (
  CASE 
    -- Users can see their own bookings
    WHEN public.has_role(auth.uid(), 'user') THEN user_id = auth.uid()
    -- Staff can see all bookings
    ELSE public.has_role(auth.uid(), 'agent') OR 
         public.has_role(auth.uid(), 'gds_expert') OR
         public.has_role(auth.uid(), 'supervisor') OR
         public.has_role(auth.uid(), 'manager') OR
         public.has_role(auth.uid(), 'admin')
  END
);

CREATE POLICY "Role-based bookings creation" ON public.bookings
FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'agent') OR 
  public.has_role(auth.uid(), 'gds_expert') OR
  public.has_role(auth.uid(), 'supervisor') OR
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Role-based bookings update" ON public.bookings
FOR UPDATE USING (
  CASE 
    -- Users can update their own bookings (limited)
    WHEN public.has_role(auth.uid(), 'user') THEN user_id = auth.uid()
    -- Staff can update any booking
    ELSE public.has_role(auth.uid(), 'agent') OR 
         public.has_role(auth.uid(), 'gds_expert') OR
         public.has_role(auth.uid(), 'supervisor') OR
         public.has_role(auth.uid(), 'manager') OR
         public.has_role(auth.uid(), 'admin')
  END
) WITH CHECK (
  CASE 
    -- Users can update their own bookings (limited)
    WHEN public.has_role(auth.uid(), 'user') THEN user_id = auth.uid()
    -- Staff can update any booking
    ELSE public.has_role(auth.uid(), 'agent') OR 
         public.has_role(auth.uid(), 'gds_expert') OR
         public.has_role(auth.uid(), 'supervisor') OR
         public.has_role(auth.uid(), 'manager') OR
         public.has_role(auth.uid(), 'admin')
  END
);

CREATE POLICY "Role-based bookings delete" ON public.bookings
FOR DELETE USING (
  public.has_role(auth.uid(), 'supervisor') OR
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin')
);

-- 5. Create table for user dashboard preferences (for 'user' role)
CREATE TABLE IF NOT EXISTS public.user_cabinets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences jsonb DEFAULT '{}',
  last_accessed timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_cabinets
ALTER TABLE public.user_cabinets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cabinet" ON public.user_cabinets
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Add status field to requests if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'requests' 
                 AND column_name = 'status' 
                 AND table_schema = 'public') THEN
    ALTER TABLE public.requests ADD COLUMN status text DEFAULT 'new';
  END IF;
END $$;