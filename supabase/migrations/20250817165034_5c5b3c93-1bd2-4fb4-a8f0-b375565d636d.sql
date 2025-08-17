-- ========================================================================
-- COMPREHENSIVE SECURITY RESOLUTION MIGRATION (FINAL)
-- Addresses all remaining security findings without touching existing functions
-- ========================================================================

-- Phase 1: Create New Enhanced Access Control Functions
-- ========================================================================

-- Function to check if user has administrative privileges (admin, manager, supervisor)
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

-- Function to check if user is a business user (any role except basic 'user')
CREATE OR REPLACE FUNCTION public.is_business_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'supervisor', 'gds_expert', 'agent')
  );
$$;

-- Phase 2: Add RLS Policies for Tables Missing Protection
-- ========================================================================

-- BOOKING_CLASSES: Restrict to business users who need booking data
CREATE POLICY "Business users can view booking classes"
ON public.booking_classes
FOR SELECT
TO authenticated
USING (public.is_business_user());

CREATE POLICY "Admins can manage booking classes"
ON public.booking_classes
FOR ALL
TO authenticated
USING (public.has_admin_role())
WITH CHECK (public.has_admin_role());

-- CLIENT_ASSIGNMENTS: Secure client-agent assignment data
CREATE POLICY "View relevant client assignments"
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
USING (public.is_business_user());

-- Enhanced AIRPORT_CODES protection - limit to business users only  
DROP POLICY IF EXISTS "Authenticated users can view airport codes" ON public.airport_codes;
CREATE POLICY "Business users can view airport codes"
ON public.airport_codes
FOR SELECT
TO authenticated
USING (public.is_business_user());

-- Enhanced AIRLINE_RBD_ASSIGNMENTS protection
DROP POLICY IF EXISTS "Authenticated users can view airline RBD assignments (auth only" ON public.airline_rbd_assignments;
CREATE POLICY "Business users can view airline RBD assignments"
ON public.airline_rbd_assignments
FOR SELECT
TO authenticated
USING (public.is_business_user());

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
-- ✅ Enhanced reference data access controls to business users only
-- ✅ Secured business intelligence data
-- ✅ Protected system tables with zero access
-- ✅ Maintained existing function dependencies
-- ========================================================================