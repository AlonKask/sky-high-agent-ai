-- Fix critical security flaw in client data access function
-- Need to drop policies first, then recreate function, then policies

-- Step 1: Drop policies that depend on the function
DROP POLICY IF EXISTS "Enhanced clients SELECT - strict access control" ON public.clients;
DROP POLICY IF EXISTS "Enhanced clients UPDATE - owner and authorized only" ON public.clients;
DROP POLICY IF EXISTS "Enhanced quotes SELECT - strict access control" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes UPDATE - owner and authorized only" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced bookings SELECT - strict access control" ON public.bookings;
DROP POLICY IF EXISTS "Enhanced bookings UPDATE - owner and authorized only" ON public.bookings;

-- Step 2: Drop and recreate the function with correct signature
DROP FUNCTION IF EXISTS public.can_access_client_data_enhanced(uuid, uuid);

CREATE OR REPLACE FUNCTION public.can_access_client_data_enhanced(target_user_id uuid, client_id uuid DEFAULT NULL)
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
  
  -- Allow users to access their own client data
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Get the accessing user's role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = accessing_user_id;
  
  -- For managers: Only allow access to direct team members' clients
  IF user_role = 'manager' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      PERFORM public.log_security_event(
        'manager_team_client_access',
        'medium',
        jsonb_build_object(
          'manager_id', accessing_user_id,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'justification', 'manager_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For supervisors: Only allow access to direct team members' clients  
  IF user_role = 'supervisor' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.manager_id = accessing_user_id
      AND tm.user_id = target_user_id
    ) INTO is_direct_team_member;
    
    IF is_direct_team_member THEN
      PERFORM public.log_security_event(
        'supervisor_team_client_access',
        'medium',
        jsonb_build_object(
          'supervisor_id', accessing_user_id,
          'team_member_id', target_user_id,
          'client_id', client_id,
          'justification', 'supervisor_oversight'
        )
      );
      RETURN true;
    END IF;
  END IF;
  
  -- For admins: Allow but with heavy logging
  IF user_role = 'admin' THEN
    PERFORM public.log_security_event(
      'admin_client_data_access',
      'high',
      jsonb_build_object(
        'admin_id', accessing_user_id,
        'target_user_id', target_user_id,
        'client_id', client_id,
        'access_reason', 'admin_override',
        'requires_justification', true,
        'timestamp', now()
      )
    );
    RETURN true;
  END IF;
  
  -- Deny all other access and log the attempt
  PERFORM public.log_security_event(
    'unauthorized_client_access_attempt',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id,
      'client_id', client_id,
      'user_role', user_role,
      'denial_reason', 'insufficient_privileges'
    )
  );
  
  RETURN false;
END;
$$;

-- Step 3: Recreate clients policies with proper security
CREATE POLICY "Enhanced clients SELECT - strict access control"
ON public.clients
FOR SELECT
TO authenticated
USING (can_access_client_data_enhanced(user_id, id));

CREATE POLICY "Enhanced clients UPDATE - owner and authorized only"
ON public.clients
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR can_access_client_data_enhanced(user_id, id))
WITH CHECK (auth.uid() = user_id);

-- Enhanced INSERT policy for clients
CREATE POLICY "Enhanced clients INSERT - strict validation"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND data_classification IN ('public', 'internal', 'confidential', 'restricted')
);

-- Recreate other table policies if they exist
DO $$
BEGIN
  -- Only recreate quotes policies if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quotes') THEN
    CREATE POLICY "Enhanced quotes SELECT - strict access control"
    ON public.quotes
    FOR SELECT
    TO authenticated
    USING (can_access_client_data_enhanced(user_id, NULL));

    CREATE POLICY "Enhanced quotes UPDATE - owner and authorized only"
    ON public.quotes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR can_access_client_data_enhanced(user_id, NULL))
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Only recreate bookings policies if table exists  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bookings') THEN
    CREATE POLICY "Enhanced bookings SELECT - strict access control"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (can_access_client_data_enhanced(user_id, NULL));

    CREATE POLICY "Enhanced bookings UPDATE - owner and authorized only"
    ON public.bookings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR can_access_client_data_enhanced(user_id, NULL))
    WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;