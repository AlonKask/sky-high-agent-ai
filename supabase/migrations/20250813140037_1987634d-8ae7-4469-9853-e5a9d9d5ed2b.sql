-- Fix client access control without the problematic SELECT trigger
-- PostgreSQL doesn't support SELECT triggers

-- Step 1: Drop dependent policies  
DROP POLICY IF EXISTS "Clients SELECT - ultra strict access control" ON public.clients;
DROP POLICY IF EXISTS "Clients UPDATE - owner only with strict oversight" ON public.clients;
DROP POLICY IF EXISTS "Enhanced clients SELECT - strict access control" ON public.clients;
DROP POLICY IF EXISTS "Enhanced clients UPDATE - owner and authorized only" ON public.clients;

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS public.can_access_client_data_enhanced(uuid, uuid);

-- Step 3: Create new ultra-strict access control function
CREATE OR REPLACE FUNCTION public.can_access_client_data_ultra_strict(target_user_id uuid, client_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
  user_role app_role;
  is_direct_team_member boolean := false;
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Allow users to access ONLY their own client data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get the accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- For managers: ONLY direct team members under active supervision
  IF user_role = 'manager' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      -- Log access with HIGH severity requiring justification
      PERFORM public.log_security_event(
        'manager_client_access',
        'high',
        jsonb_build_object(
          'manager_id', accessing_user_id,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'access_type', 'team_supervision',
          'requires_justification', true
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For supervisors: ONLY direct team members 
  IF user_role = 'supervisor' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      -- Log access with HIGH severity requiring justification
      PERFORM public.log_security_event(
        'supervisor_client_access',
        'high',
        jsonb_build_object(
          'supervisor_id', accessing_user_id,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'access_type', 'team_supervision',
          'requires_justification', true
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: Allow with CRITICAL logging requiring business justification
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_client_override',
      'critical',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id,
        'requires_business_justification', true,
        'compliance_review_required', true
      )
    );
    RETURN true;
  END IF;
  
  -- DENY all other access and log as security violation
  PERFORM public.log_security_event(
    'client_access_violation',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'client_id', client_id,
      'user_role', user_role,
      'violation_type', 'unauthorized_client_access'
    )
  );
  
  RETURN false;
END;
$$;

-- Step 4: Create ultra-strict policies
CREATE POLICY "Clients SELECT - zero trust access control"
ON public.clients
FOR SELECT
TO authenticated
USING (can_access_client_data_ultra_strict(user_id, id));

CREATE POLICY "Clients UPDATE - owner only strict"
ON public.clients
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR can_access_client_data_ultra_strict(user_id, id))
WITH CHECK (auth.uid() = user_id);

-- Step 5: Add data classification enforcement
CREATE POLICY "Clients INSERT - strict data classification"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND data_classification IN ('confidential', 'restricted')
);

-- Step 6: Create audit trigger for INSERT/UPDATE/DELETE operations only
CREATE OR REPLACE FUNCTION public.audit_client_modifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log modifications to client data
  PERFORM public.log_security_event(
    'client_data_modified',
    'high',
    jsonb_build_object(
      'client_id', COALESCE(NEW.id, OLD.id),
      'client_owner', COALESCE(NEW.user_id, OLD.user_id),
      'modified_by', auth.uid(),
      'operation', TG_OP,
      'table', 'clients',
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for modifications only (not SELECT)
DROP TRIGGER IF EXISTS audit_client_modifications_trigger ON public.clients;
CREATE TRIGGER audit_client_modifications_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_client_modifications();