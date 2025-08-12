
-- 1) Harden function search_path to prevent mutable resolution
CREATE OR REPLACE FUNCTION public.can_modify_data(_user_id uuid, _resource_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT 
    -- User can modify their own data
    _user_id = _resource_user_id OR
    -- Or if they have supervisor/manager/admin role
    has_role(_user_id, 'supervisor'::app_role) OR
    has_role(_user_id, 'manager'::app_role) OR 
    has_role(_user_id, 'admin'::app_role)
$function$;

-- 2) Fix: RLS enabled but no policies for team_performance
-- Ensure RLS is enabled
ALTER TABLE public.team_performance ENABLE ROW LEVEL SECURITY;

-- Create secure policies
-- View: privileged roles or owners/supervisors
DROP POLICY IF EXISTS "Team performance - view" ON public.team_performance;
CREATE POLICY "Team performance - view"
ON public.team_performance
FOR SELECT
USING (
  public.can_manage_teams(auth.uid())  -- admins, managers, supervisors
  OR auth.uid() = team_member_id
  OR auth.uid() = supervisor_id
);

-- Insert: only privileged roles
DROP POLICY IF EXISTS "Team performance - insert" ON public.team_performance;
CREATE POLICY "Team performance - insert"
ON public.team_performance
FOR INSERT
WITH CHECK (public.can_manage_teams(auth.uid()));

-- Update: only privileged roles
DROP POLICY IF EXISTS "Team performance - update" ON public.team_performance;
CREATE POLICY "Team performance - update"
ON public.team_performance
FOR UPDATE
USING (public.can_manage_teams(auth.uid()))
WITH CHECK (public.can_manage_teams(auth.uid()));

-- Delete: only privileged roles
DROP POLICY IF EXISTS "Team performance - delete" ON public.team_performance;
CREATE POLICY "Team performance - delete"
ON public.team_performance
FOR DELETE
USING (public.can_manage_teams(auth.uid()));

-- 3) Tighten access to rate_limits (contains sensitive usage patterns)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive policy, if present
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;

-- Allow only privileged roles to view
DROP POLICY IF EXISTS "Admins and managers can view rate limits" ON public.rate_limits;
CREATE POLICY "Admins and managers can view rate limits"
ON public.rate_limits
FOR SELECT
USING (public.can_manage_teams(auth.uid()));

-- Note: No INSERT/UPDATE/DELETE policies are added for clients.
-- Service role (Edge Functions) bypass RLS for writes.

-- 4) Restrict airline RBD tables to authenticated-only for SELECT
-- Airline RBD templates
DROP POLICY IF EXISTS "Authenticated users can view RBD templates" ON public.airline_rbd_templates;
DROP POLICY IF EXISTS "Authenticated users can view RBD templates (auth only)" ON public.airline_rbd_templates;
CREATE POLICY "Authenticated users can view RBD templates (auth only)"
ON public.airline_rbd_templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Airline RBD assignments
DROP POLICY IF EXISTS "Authenticated users can view airline RBD assignments" ON public.airline_rbd_assignments;
DROP POLICY IF EXISTS "Authenticated users can view airline RBD assignments (auth only)" ON public.airline_rbd_assignments;
CREATE POLICY "Authenticated users can view airline RBD assignments (auth only)"
ON public.airline_rbd_assignments
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5) Eliminate duplicate key errors for email_sync_status with an upsert trigger
-- Converts duplicate INSERTs into UPDATEs automatically
CREATE OR REPLACE FUNCTION public.email_sync_status_insert_or_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.email_sync_status
  SET 
    last_sync_at = COALESCE(NEW.last_sync_at, last_sync_at),
    last_sync_count = COALESCE(NEW.last_sync_count, last_sync_count),
    gmail_history_id = COALESCE(NEW.gmail_history_id, gmail_history_id),
    updated_at = now()
  WHERE user_id = NEW.user_id
    AND folder_name = NEW.folder_name;

  IF FOUND THEN
    -- Skip insert; converted to update
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS email_sync_status_upsert ON public.email_sync_status;

CREATE TRIGGER email_sync_status_upsert
BEFORE INSERT ON public.email_sync_status
FOR EACH ROW
EXECUTE FUNCTION public.email_sync_status_insert_or_update();
