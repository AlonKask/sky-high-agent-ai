-- Fix infinite recursion in team_members RLS policies
-- First, create security definer functions to avoid circular references

-- Function to get teams a user belongs to
CREATE OR REPLACE FUNCTION public.get_user_teams(_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT tm.team_id
  FROM public.team_members tm
  WHERE tm.user_id = _user_id;
$$;

-- Function to check if user is a team manager
CREATE OR REPLACE FUNCTION public.is_team_manager(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = _team_id
    AND t.manager_id = _user_id
  );
$$;

-- Function to check if user can manage teams (admin, manager, supervisor roles)
CREATE OR REPLACE FUNCTION public.can_manage_teams(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role IN ('admin', 'manager', 'supervisor')
  );
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team managers can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team managers can remove members" ON public.team_members;
DROP POLICY IF EXISTS "Supervisors can manage all team members" ON public.team_members;

-- Create new RLS policies for team_members without recursion
CREATE POLICY "Users can view their team memberships"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.is_team_manager(auth.uid(), team_id) OR
  public.can_manage_teams(auth.uid())
);

CREATE POLICY "Team managers can add team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_team_manager(auth.uid(), team_id) OR
  public.can_manage_teams(auth.uid())
);

CREATE POLICY "Team managers can remove team members"
ON public.team_members
FOR DELETE
TO authenticated
USING (
  public.is_team_manager(auth.uid(), team_id) OR
  public.can_manage_teams(auth.uid())
);

-- Create teams table if it doesn't exist and set up RLS
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  manager_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create team_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_team text DEFAULT 'member',
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS on team_members table
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for teams table
DROP POLICY IF EXISTS "Users can view all teams" ON public.teams;
DROP POLICY IF EXISTS "Managers can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team managers can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Managers can delete teams" ON public.teams;

CREATE POLICY "Users can view all teams"
ON public.teams
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_teams(auth.uid()));

CREATE POLICY "Team managers can update their teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  manager_id = auth.uid() OR
  public.can_manage_teams(auth.uid())
);

CREATE POLICY "Managers can delete teams"
ON public.teams
FOR DELETE
TO authenticated
USING (
  manager_id = auth.uid() OR
  public.can_manage_teams(auth.uid())
);

-- Add updated_at trigger for teams table
CREATE OR REPLACE FUNCTION public.update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_teams_updated_at();