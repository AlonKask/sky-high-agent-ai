-- ========================================================================
-- COMPREHENSIVE SECURITY RESOLUTION MIGRATION (FIXED)
-- Addresses all remaining security findings: 1 error, 2 warnings, 5 info
-- ========================================================================

-- Phase 1: Fix Function Conflicts and Create Enhanced Access Control
-- ========================================================================

-- Drop existing function to avoid parameter conflicts
DROP FUNCTION IF EXISTS public.can_manage_teams(uuid);

-- Function to check if user has administrative privileges
CREATE OR REPLACE FUNCTION public.has_admin_role()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'supervisor')
  );
$$;

-- Recreate can_manage_teams function with corrected parameter
CREATE OR REPLACE FUNCTION public.can_manage_teams(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = target_user_id 
    AND role IN ('admin', 'manager', 'supervisor')
  );
$$;

-- Function to check communication data access permissions
CREATE OR REPLACE FUNCTION public.can_access_communication_data(owner_user_id uuid, client_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Owner can always access
    auth.uid() = owner_user_id
    OR
    -- Admin/Manager can access team members' data
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'manager', 'supervisor')
    )
    OR
    -- Agent can access if client is assigned to them
    EXISTS (
      SELECT 1 FROM public.client_assignments ca
      WHERE ca.client_id = client_id_param
      AND ca.agent_id = auth.uid()
      AND ca.is_active = true
    );
$$;

-- Phase 2: Add RLS Policies for Tables Missing Protection
-- ========================================================================

-- BOOKING_CLASSES: Restrict to authenticated users who need booking data
CREATE POLICY "Authenticated users can view booking classes"
ON public.booking_classes
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage booking classes"
ON public.booking_classes
FOR ALL
TO authenticated
USING (public.has_admin_role())
WITH CHECK (public.has_admin_role());

-- CLIENT_ASSIGNMENTS: Secure client-agent assignment data
CREATE POLICY "View own client assignments"
ON public.client_assignments
FOR SELECT
TO authenticated
USING (
  auth.uid() = agent_id 
  OR auth.uid() = assigned_by
  OR public.has_admin_role()
);

CREATE POLICY "Managers can create client assignments"
ON public.client_assignments
FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_role());

CREATE POLICY "Managers can update client assignments"
ON public.client_assignments
FOR UPDATE
TO authenticated
USING (public.has_admin_role())
WITH CHECK (public.has_admin_role());

CREATE POLICY "Managers can delete client assignments"
ON public.client_assignments
FOR DELETE
TO authenticated
USING (public.has_admin_role());

-- DATA_RETENTION_POLICIES: Admin-only access
CREATE POLICY "Admin-only data retention policies"
ON public.data_retention_policies
FOR ALL
TO authenticated
USING (public.has_admin_role())
WITH CHECK (public.has_admin_role());

-- ENCRYPTION_KEYS: System-level access only (deny all user access)
CREATE POLICY "System-only encryption keys access"
ON public.encryption_keys
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Phase 3: Enhance Reference Data Protection
-- ========================================================================

-- Enhanced AIRLINE_CODES protection - limit to business users only
DROP POLICY IF EXISTS "Authenticated users can view airline codes" ON public.airline_codes;
CREATE POLICY "Business users can view airline codes"
ON public.airline_codes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'supervisor', 'gds_expert', 'agent')
  )
);

-- Enhanced AIRPORT_CODES protection - limit to business users only
DROP POLICY IF EXISTS "Authenticated users can view airport codes" ON public.airport_codes;
CREATE POLICY "Business users can view airport codes"
ON public.airport_codes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'supervisor', 'gds_expert', 'agent')
  )
);

-- Enhanced AIRLINE_RBD_ASSIGNMENTS protection
DROP POLICY IF EXISTS "Authenticated users can view airline RBD assignments (auth only" ON public.airline_rbd_assignments;
CREATE POLICY "Business users can view airline RBD assignments"
ON public.airline_rbd_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'supervisor', 'gds_expert', 'agent')
  )
);

-- Phase 4: Security Event Logging
-- ========================================================================

-- Log the completion of security hardening
SELECT public.log_security_event(
  'comprehensive_security_hardening_completed',
  'medium',
  jsonb_build_object(
    'phase', 'complete_resolution',
    'tables_secured', ARRAY[
      'booking_classes',
      'client_assignments', 
      'data_retention_policies',
      'encryption_keys',
      'airline_codes',
      'airport_codes',
      'airline_rbd_assignments'
    ],
    'timestamp', now()
  )
);

-- ========================================================================
-- MIGRATION COMPLETE
-- All security findings should now be resolved:
-- ✅ Added RLS policies for tables missing protection
-- ✅ Enhanced reference data access controls  
-- ✅ Secured business intelligence data
-- ✅ Protected system tables with zero access
-- ========================================================================