-- Tighten clients SELECT RLS to team scope and remove global elevated view

-- Drop the previous elevated roles SELECT policy if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'Elevated roles can view clients'
  ) THEN
    DROP POLICY "Elevated roles can view clients" ON public.clients;
  END IF;
END $$;

-- Create team-scoped SELECT policy for managers and supervisors; admins retain global access
CREATE POLICY "Team leaders can view team clients"
ON public.clients
FOR SELECT
USING (
  -- Admins still have full read access to avoid breaking admin workflows
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    -- Viewer is a supervisor/manager and the client belongs to a user in any of the viewer's teams
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = public.clients.user_id
      AND (
        -- Teams the viewer belongs to
        tm.team_id IN (SELECT team_id FROM public.get_user_teams(auth.uid()))
        -- Teams the viewer manages
        OR tm.team_id IN (SELECT t.id FROM public.teams t WHERE t.manager_id = auth.uid())
      )
  )
);

-- Ensure RLS remains enabled (no-op if already enabled)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;