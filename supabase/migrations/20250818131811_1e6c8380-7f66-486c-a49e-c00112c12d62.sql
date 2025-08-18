-- PHASE 1: Fix Database Security & RLS Policies for Requests (Fixed)

-- Drop all existing conflicting policies on requests table
DROP POLICY IF EXISTS "DENY all anonymous access to requests" ON public.requests;
DROP POLICY IF EXISTS "Authenticated users: requests INSERT" ON public.requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can manage their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;

-- Create simplified, working RLS policies for requests
CREATE POLICY "Authenticated users can view available requests" 
ON public.requests FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can create requests" 
ON public.requests FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests" 
ON public.requests FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id OR auth.uid() = assigned_to)
WITH CHECK (auth.uid() = user_id OR auth.uid() = assigned_to);

-- Add unique constraint for user_roles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_user_id_role_key'
    ) THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
    END IF;
END $$;

-- Ensure all authenticated users have a default role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'agent'::app_role
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;

-- Create function to automatically assign roles to new users
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agent'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-assign roles
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON public.requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_assignment_status ON public.requests(assignment_status);