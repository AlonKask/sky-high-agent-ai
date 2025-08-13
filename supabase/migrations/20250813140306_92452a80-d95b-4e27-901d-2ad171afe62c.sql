-- CRITICAL: Remove all conflicting policies and implement zero-trust access
-- Issue: Multiple INSERT policies create security loopholes

-- Step 1: Remove ALL existing policies on clients table
DROP POLICY IF EXISTS "DENY all anonymous access to clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users: clients DELETE" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users: clients INSERT" ON public.clients;
DROP POLICY IF EXISTS "Clients INSERT - strict data classification" ON public.clients;
DROP POLICY IF EXISTS "Enhanced clients INSERT - strict validation" ON public.clients;
DROP POLICY IF EXISTS "Clients SELECT - zero trust access control" ON public.clients;
DROP POLICY IF EXISTS "Clients UPDATE - owner only strict" ON public.clients;

-- Step 2: Implement SINGLE zero-trust policy set with no loopholes
-- Anonymous access: COMPLETELY BLOCKED
CREATE POLICY "ABSOLUTE_DENY_anonymous_access_to_clients"
ON public.clients
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Authenticated SELECT: ONLY own clients + strict team supervision
CREATE POLICY "ZERO_TRUST_clients_select"
ON public.clients
FOR SELECT
TO authenticated
USING (can_access_client_data_ultra_strict(user_id, id));

-- Authenticated INSERT: ONLY for own clients with validation
CREATE POLICY "ZERO_TRUST_clients_insert"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND data_classification IN ('confidential', 'restricted')
  AND email IS NOT NULL
  AND first_name IS NOT NULL
  AND last_name IS NOT NULL
);

-- Authenticated UPDATE: ONLY own clients or authorized oversight
CREATE POLICY "ZERO_TRUST_clients_update"
ON public.clients
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR can_access_client_data_ultra_strict(user_id, id))
WITH CHECK (auth.uid() = user_id);

-- Authenticated DELETE: ONLY own clients
CREATE POLICY "ZERO_TRUST_clients_delete"
ON public.clients
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Step 3: Create additional zero-trust validation
CREATE OR REPLACE FUNCTION public.validate_client_access_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_role app_role;
  is_authorized boolean := false;
BEGIN
  -- Get user role for context validation
  SELECT role INTO accessing_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Validate context for any client access
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Ensure user is creating/updating their own client record
    IF NEW.user_id != auth.uid() THEN
      -- Only allow if user has authorized role and is supervising
      IF accessing_user_role IN ('manager', 'supervisor', 'admin') THEN
        -- Check if this is legitimate team supervision
        IF accessing_user_role IN ('manager', 'supervisor') THEN
          SELECT EXISTS(
            SELECT 1 FROM public.teams t
            JOIN public.team_members tm ON t.id = tm.team_id
            WHERE t.manager_id = auth.uid()
            AND tm.user_id = NEW.user_id
          ) INTO is_authorized;
          
          IF NOT is_authorized THEN
            RAISE EXCEPTION 'SECURITY VIOLATION: Unauthorized client data modification attempt by user % for client owned by %', 
              auth.uid(), NEW.user_id;
          END IF;
        END IF;
        
        -- Log all cross-user access as high severity
        PERFORM public.log_security_event(
          'cross_user_client_modification',
          'critical',
          jsonb_build_object(
            'accessing_user', auth.uid(),
            'client_owner', NEW.user_id,
            'operation', TG_OP,
            'requires_audit', true
          )
        );
      ELSE
        RAISE EXCEPTION 'SECURITY VIOLATION: User % attempted to modify client data for user %', 
          auth.uid(), NEW.user_id;
      END IF;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create security validation trigger
DROP TRIGGER IF EXISTS validate_client_access_trigger ON public.clients;
CREATE TRIGGER validate_client_access_trigger
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_access_context();

-- Step 4: Create emergency breach detection
CREATE OR REPLACE FUNCTION public.detect_client_data_breach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Detect potential data breach patterns
  IF auth.uid() IS NULL THEN
    -- Log critical security event for unauthenticated access attempt
    PERFORM public.log_security_event(
      'CRITICAL_BREACH_ATTEMPT',
      'critical',
      jsonb_build_object(
        'attack_type', 'unauthenticated_client_access',
        'attempted_operation', TG_OP,
        'timestamp', now(),
        'alert_level', 'MAXIMUM'
      )
    );
    
    RAISE EXCEPTION 'CRITICAL SECURITY BREACH: Unauthenticated access to client data attempted';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create breach detection trigger
DROP TRIGGER IF EXISTS detect_breach_trigger ON public.clients;
CREATE TRIGGER detect_breach_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.detect_client_data_breach();