-- Fix teams functionality step by step

-- First, ensure all users have a default role (avoiding conflicts)
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.id, 'admin'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
);

-- Drop all existing policies for teams table
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
DROP POLICY IF EXISTS "Users with management permissions can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team managers and admins can update teams" ON public.teams;
DROP POLICY IF EXISTS "Team managers and admins can delete teams" ON public.teams;

-- Drop all existing policies for team_members table  
DROP POLICY IF EXISTS "Anyone can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team managers and admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team managers and admins can update member roles" ON public.team_members;
DROP POLICY IF EXISTS "Team managers and admins can remove members" ON public.team_members;

-- Create simplified RLS policies for teams table
CREATE POLICY "teams_select_policy"
ON public.teams
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "teams_insert_policy"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (can_manage_teams(auth.uid()));

CREATE POLICY "teams_update_policy"
ON public.teams
FOR UPDATE
TO authenticated
USING (can_manage_teams(auth.uid()) OR is_team_manager(auth.uid(), id));

CREATE POLICY "teams_delete_policy"
ON public.teams
FOR DELETE
TO authenticated
USING (can_manage_teams(auth.uid()) OR is_team_manager(auth.uid(), id));

-- Create simplified RLS policies for team_members table
CREATE POLICY "team_members_select_policy"
ON public.team_members
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "team_members_insert_policy"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (can_manage_teams(auth.uid()) OR is_team_manager(auth.uid(), team_id));

CREATE POLICY "team_members_update_policy"
ON public.team_members
FOR UPDATE
TO authenticated
USING (can_manage_teams(auth.uid()) OR is_team_manager(auth.uid(), team_id));

CREATE POLICY "team_members_delete_policy"
ON public.team_members
FOR DELETE
TO authenticated
USING (can_manage_teams(auth.uid()) OR is_team_manager(auth.uid(), team_id));