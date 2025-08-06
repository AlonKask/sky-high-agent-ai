-- Clean up all existing policies for teams and team_members tables completely

-- Drop all existing policies for teams table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'teams'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END
$$;

-- Drop all existing policies for team_members table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'team_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END
$$;

-- Ensure all users have a default role
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.id, 'user'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Create clean RLS policies for teams table
CREATE POLICY "Anyone can view teams"
ON public.teams
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users with management permissions can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (can_manage_teams(auth.uid()));

CREATE POLICY "Team managers and admins can update teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (is_team_manager(auth.uid(), id) OR can_manage_teams(auth.uid()))
WITH CHECK (is_team_manager(auth.uid(), id) OR can_manage_teams(auth.uid()));

CREATE POLICY "Team managers and admins can delete teams"
ON public.teams
FOR DELETE
TO authenticated
USING (is_team_manager(auth.uid(), id) OR can_manage_teams(auth.uid()));

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
WITH CHECK (is_team_manager(auth.uid(), team_id) OR can_manage_teams(auth.uid()));

CREATE POLICY "Team managers and admins can update member roles"
ON public.team_members
FOR UPDATE
TO authenticated
USING (is_team_manager(auth.uid(), team_id) OR can_manage_teams(auth.uid()))
WITH CHECK (is_team_manager(auth.uid(), team_id) OR can_manage_teams(auth.uid()));

CREATE POLICY "Team managers and admins can remove members"
ON public.team_members
FOR DELETE
TO authenticated
USING (is_team_manager(auth.uid(), team_id) OR can_manage_teams(auth.uid()));

-- Fix search_path for security definer functions
ALTER FUNCTION public.get_user_teams(_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.is_team_manager(_user_id uuid, _team_id uuid) SET search_path = 'public';
ALTER FUNCTION public.can_manage_teams(_user_id uuid) SET search_path = 'public';