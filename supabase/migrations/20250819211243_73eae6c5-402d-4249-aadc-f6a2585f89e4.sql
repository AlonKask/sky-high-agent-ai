-- Simplified fix for requests access - only update what's needed
-- Update only the requests table policies for now

-- Update requests table policies to allow proper access
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.requests;

-- Create simple access policies for requests (using existing has_role function)
CREATE POLICY "Role-based requests access" ON public.requests
FOR SELECT USING (
  CASE 
    -- Staff roles can see all requests
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('agent', 'gds_expert', 'supervisor', 'manager', 'admin')
    ) THEN true
    -- Users can only see their own requests
    ELSE user_id = auth.uid()
  END
);

CREATE POLICY "Role-based requests creation" ON public.requests
FOR INSERT WITH CHECK (
  CASE 
    -- Staff roles can create requests for any user
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('agent', 'gds_expert', 'supervisor', 'manager', 'admin')
    ) THEN true
    -- Users can create their own requests
    ELSE user_id = auth.uid()
  END
);

CREATE POLICY "Role-based requests update" ON public.requests
FOR UPDATE USING (
  CASE 
    -- Staff roles can update any request
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('agent', 'gds_expert', 'supervisor', 'manager', 'admin')
    ) THEN true
    -- Users can update their own requests
    ELSE user_id = auth.uid()
  END
) WITH CHECK (
  CASE 
    -- Staff roles can update any request
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('agent', 'gds_expert', 'supervisor', 'manager', 'admin')
    ) THEN true
    -- Users can update their own requests
    ELSE user_id = auth.uid()
  END
);

CREATE POLICY "Role-based requests delete" ON public.requests
FOR DELETE USING (
  CASE 
    -- Only supervisors and above can delete requests
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('supervisor', 'manager', 'admin')
    ) THEN true
    -- Users can delete their own requests
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'user'
    ) AND user_id = auth.uid() THEN true
    ELSE false
  END
);

-- Create table for user dashboard preferences
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