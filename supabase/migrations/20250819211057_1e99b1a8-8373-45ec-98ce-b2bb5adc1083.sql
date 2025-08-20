-- Fix RLS policies to support proper role-based access control
-- Drop existing functions first to avoid parameter conflicts

DROP FUNCTION IF EXISTS public.can_access_satisfaction_scores(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.can_manage_teams(uuid);

-- Recreate functions with correct signatures
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

-- Update requests table policies to allow proper access
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

-- Create table for user dashboard preferences (for 'user' role)
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

-- Add status field to requests if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'requests' 
                 AND column_name = 'status' 
                 AND table_schema = 'public') THEN
    ALTER TABLE public.requests ADD COLUMN status text DEFAULT 'new';
  END IF;
END $$;