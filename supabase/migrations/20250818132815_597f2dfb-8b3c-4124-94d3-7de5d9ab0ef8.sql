-- CRITICAL SECURITY FIX: Restrict requests table access to prevent data theft

-- Drop the overly permissive policy that allows any authenticated user to see all requests
DROP POLICY IF EXISTS "Authenticated users can view available requests" ON public.requests;

-- Create secure, user-specific access policies for requests table

-- 1. Users can only view their own requests
CREATE POLICY "Users can view their own requests" 
ON public.requests FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- 2. Users can view requests assigned to them (for agents taking requests)
CREATE POLICY "Users can view assigned requests" 
ON public.requests FOR SELECT 
TO authenticated 
USING (auth.uid() = assigned_to);

-- 3. Managers can view requests from their direct team members only
CREATE POLICY "Managers can view team requests" 
ON public.requests FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur1
    JOIN public.teams t ON t.manager_id = auth.uid()
    JOIN public.team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = requests.user_id
    AND ur1.user_id = auth.uid() 
    AND ur1.role IN ('manager', 'supervisor', 'admin')
  )
);

-- 4. Emergency admin access (with logging) - only for critical situations
CREATE POLICY "Emergency admin access to requests" 
ON public.requests FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
  AND (
    -- Log this admin access for audit purposes
    public.log_security_event(
      'admin_emergency_request_access',
      'critical',
      jsonb_build_object(
        'admin_user_id', auth.uid(),
        'accessed_request_id', requests.id,
        'request_owner', requests.user_id,
        'justification_required', true
      )
    ) IS NOT NULL
  )
);