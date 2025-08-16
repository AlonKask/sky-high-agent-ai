-- Fix function search_path security issue
-- Set search_path for all functions that don't have it explicitly set

-- Fix existing functions with mutable search_path
CREATE OR REPLACE FUNCTION public.get_user_teams(_user_id uuid)
 RETURNS TABLE(team_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT tm.team_id
  FROM public.team_members tm
  WHERE tm.user_id = _user_id;
$function$;

CREATE OR REPLACE FUNCTION public.is_team_manager(_user_id uuid, _team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = _team_id
    AND t.manager_id = _user_id
  );
$function$;

-- Update any remaining functions that might have mutable search_path
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL;
$function$;