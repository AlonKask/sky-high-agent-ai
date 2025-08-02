-- Final cleanup and fix for teams RLS policies
-- Remove all conflicting policies and create simple ones

-- Drop specific policies by name for teams table
DROP POLICY IF EXISTS "Admins and managers can delete teams" ON public.teams;
DROP POLICY IF EXISTS "Managers and admins can create teams" ON public.teams;
DROP POLICY IF EXISTS "Managers can create teams" ON public.teams;
DROP POLICY IF EXISTS "Managers can delete teams" ON public.teams;
DROP POLICY IF EXISTS "Team managers can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view all teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they are members of or manage" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;

-- Drop specific policies by name for team_members table
DROP POLICY IF EXISTS "Team managers and admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team managers can add team members" ON public.team_members;
DROP POLICY IF EXISTS "Team managers can remove team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their team memberships" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON public.team_members;

-- Create new simple policies for teams
CREATE POLICY "teams_allow_select" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_allow_insert" ON public.teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "teams_allow_update" ON public.teams FOR UPDATE TO authenticated USING (true);
CREATE POLICY "teams_allow_delete" ON public.teams FOR DELETE TO authenticated USING (true);

-- Create new simple policies for team_members
CREATE POLICY "team_members_allow_select" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_members_allow_insert" ON public.team_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "team_members_allow_update" ON public.team_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "team_members_allow_delete" ON public.team_members FOR DELETE TO authenticated USING (true);