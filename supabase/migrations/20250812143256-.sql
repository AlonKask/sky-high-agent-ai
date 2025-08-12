-- Secure RLS for teams and team_members
-- 1) Ensure RLS is enabled
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 2) Drop overly permissive policies if they exist
DROP POLICY IF EXISTS "teams_allow_select" ON public.teams;
DROP POLICY IF EXISTS "teams_allow_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_allow_update" ON public.teams;
DROP POLICY IF EXISTS "teams_allow_delete" ON public.teams;

DROP POLICY IF EXISTS "team_members_allow_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_allow_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_allow_update" ON public.team_members;
DROP POLICY IF EXISTS "team_members_allow_delete" ON public.team_members;

-- 3) Create secure policies for teams table
-- View: team members (via function) and privileged roles can view
CREATE POLICY "Team members and managers can view teams"
ON public.teams
FOR SELECT
USING (
  public.can_manage_teams(auth.uid()) OR
  id IN (SELECT team_id FROM public.get_user_teams(auth.uid()))
);

-- Create: only privileged roles
CREATE POLICY "Managers can create teams"
ON public.teams
FOR INSERT
WITH CHECK (public.can_manage_teams(auth.uid()));

-- Update: privileged roles or the team manager
CREATE POLICY "Managers or team managers can update teams"
ON public.teams
FOR UPDATE
USING (public.can_manage_teams(auth.uid()) OR public.is_team_manager(auth.uid(), id))
WITH CHECK (public.can_manage_teams(auth.uid()) OR public.is_team_manager(auth.uid(), id));

-- Delete: privileged roles or the team manager
CREATE POLICY "Managers or team managers can delete teams"
ON public.teams
FOR DELETE
USING (public.can_manage_teams(auth.uid()) OR public.is_team_manager(auth.uid(), id));

-- 4) Create secure policies for team_members table
-- View: members of the team or privileged roles
CREATE POLICY "Members and managers can view team memberships"
ON public.team_members
FOR SELECT
USING (
  public.can_manage_teams(auth.uid()) OR
  team_id IN (SELECT team_id FROM public.get_user_teams(auth.uid()))
);

-- Insert: privileged roles or the team manager of that team
CREATE POLICY "Managers or team managers can add team members"
ON public.team_members
FOR INSERT
WITH CHECK (
  public.can_manage_teams(auth.uid()) OR
  public.is_team_manager(auth.uid(), team_id)
);

-- Update: privileged roles or the team manager
CREATE POLICY "Managers or team managers can update team memberships"
ON public.team_members
FOR UPDATE
USING (
  public.can_manage_teams(auth.uid()) OR
  public.is_team_manager(auth.uid(), team_id)
)
WITH CHECK (
  public.can_manage_teams(auth.uid()) OR
  public.is_team_manager(auth.uid(), team_id)
);

-- Delete: privileged roles, team manager, or the user can remove their own membership
CREATE POLICY "Managers, team managers, or users can delete their own membership"
ON public.team_members
FOR DELETE
USING (
  public.can_manage_teams(auth.uid()) OR
  public.is_team_manager(auth.uid(), team_id) OR
  auth.uid() = user_id
);
