
-- 0) Harden can_modify_data to avoid app_role dependency and set immutable search_path
CREATE OR REPLACE FUNCTION public.can_modify_data(_user_id uuid, _resource_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT 
    -- User can modify their own data
    _user_id = _resource_user_id
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role IN ('supervisor', 'manager', 'admin')
    );
$function$;

-- 1) team_performance: enable RLS and add secure policies
ALTER TABLE public.team_performance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Team performance - view" ON public.team_performance;
DROP POLICY IF EXISTS "Team performance - insert" ON public.team_performance;
DROP POLICY IF EXISTS "Team performance - update" ON public.team_performance;
DROP POLICY IF EXISTS "Team performance - delete" ON public.team_performance;

-- View: privileged roles or owners/supervisors
CREATE POLICY "Team performance - view"
ON public.team_performance
FOR SELECT
USING (
  public.can_manage_teams(auth.uid())  -- admins, managers, supervisors
  OR auth.uid() = team_member_id
  OR auth.uid() = supervisor_id
);

-- Insert: only privileged roles
CREATE POLICY "Team performance - insert"
ON public.team_performance
FOR INSERT
WITH CHECK (public.can_manage_teams(auth.uid()));

-- Update: only privileged roles
CREATE POLICY "Team performance - update"
ON public.team_performance
FOR UPDATE
USING (public.can_manage_teams(auth.uid()))
WITH CHECK (public.can_manage_teams(auth.uid()));

-- Delete: only privileged roles
CREATE POLICY "Team performance - delete"
ON public.team_performance
FOR DELETE
USING (public.can_manage_teams(auth.uid()));

-- 2) rate_limits: lock down read access to privileged roles, no write policies for clients
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop overly-permissive policy and any previous view policy (idempotent)
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Admins and managers can view rate limits" ON public.rate_limits;

-- Allow only privileged roles to view
CREATE POLICY "Admins and managers can view rate limits"
ON public.rate_limits
FOR SELECT
USING (public.can_manage_teams(auth.uid()));

-- 3) Airline RBD tables: restrict read to authenticated users only (keep existing admin/manager manage policy)
-- airline_rbd_templates
ALTER TABLE public.airline_rbd_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view RBD templates" ON public.airline_rbd_templates;
DROP POLICY IF EXISTS "Authenticated users can view RBD templates (auth only)" ON public.airline_rbd_templates;

CREATE POLICY "Authenticated users can view RBD templates (auth only)"
ON public.airline_rbd_templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- airline_rbd_assignments
ALTER TABLE public.airline_rbd_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view airline RBD assignments" ON public.airline_rbd_assignments;
DROP POLICY IF EXISTS "Authenticated users can view airline RBD assignments (auth only)" ON public.airline_rbd_assignments;

CREATE POLICY "Authenticated users can view airline RBD assignments (auth only)"
ON public.airline_rbd_assignments
FOR SELECT
USING (auth.uid() IS NOT NULL);
