-- Fix teams functionality by cleaning up RLS policies and ensuring proper role assignment

-- First, drop existing conflicting policies for teams table
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;
DROP POLICY IF EXISTS "Team managers can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Team managers can delete their teams" ON public.teams;

-- Drop existing policies for team_members table
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team managers can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Users can manage team members" ON public.team_members;

-- Ensure all users have a default role (this fixes the missing role issue)
-- Insert default 'user' role for all existing users who don't have roles
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.id, 'user'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
);

-- Create clean, non-recursive RLS policies for teams table
CREATE POLICY "Anyone can view teams"
ON public.teams
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users with management permissions can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (
    can_manage_teams(auth.uid())
);

CREATE POLICY "Team managers and admins can update teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (
    is_team_manager(auth.uid(), id) OR 
    can_manage_teams(auth.uid())
)
WITH CHECK (
    is_team_manager(auth.uid(), id) OR 
    can_manage_teams(auth.uid())
);

CREATE POLICY "Team managers and admins can delete teams"
ON public.teams
FOR DELETE
TO authenticated
USING (
    is_team_manager(auth.uid(), id) OR 
    can_manage_teams(auth.uid())
);

-- Create clean RLS policies for team_members table
CREATE POLICY "Anyone can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team managers and admins can add members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
    is_team_manager(auth.uid(), team_id) OR 
    can_manage_teams(auth.uid())
);

CREATE POLICY "Team managers and admins can update member roles"
ON public.team_members
FOR UPDATE
TO authenticated
USING (
    is_team_manager(auth.uid(), team_id) OR 
    can_manage_teams(auth.uid())
)
WITH CHECK (
    is_team_manager(auth.uid(), team_id) OR 
    can_manage_teams(auth.uid())
);

CREATE POLICY "Team managers and admins can remove members"
ON public.team_members
FOR DELETE
TO authenticated
USING (
    is_team_manager(auth.uid(), team_id) OR 
    can_manage_teams(auth.uid())
);

-- Fix search_path for security definer functions
ALTER FUNCTION public.get_user_teams(_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.is_team_manager(_user_id uuid, _team_id uuid) SET search_path = 'public';
ALTER FUNCTION public.can_manage_teams(_user_id uuid) SET search_path = 'public';