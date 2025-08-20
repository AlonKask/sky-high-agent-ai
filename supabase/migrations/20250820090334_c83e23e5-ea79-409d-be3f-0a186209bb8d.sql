-- Fix RLS policies for user_roles table and enhance database security
-- Add comprehensive RLS policies for user_roles table

-- Create secure RLS policies for user_roles table
CREATE POLICY "user_roles_secure_select" 
ON public.user_roles 
FOR SELECT 
USING (
  -- Users can see their own role
  auth.uid() = user_id 
  OR 
  -- Admins can see all roles
  public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "user_roles_secure_insert" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  -- Only admins can assign roles
  public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "user_roles_secure_update" 
ON public.user_roles 
FOR UPDATE 
USING (
  -- Only admins can modify roles
  public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  -- Only admins can set new role values
  public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "user_roles_secure_delete" 
ON public.user_roles 
FOR DELETE 
USING (
  -- Only admins can delete roles
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Create audit trigger for user_roles changes
CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all user role changes as high-severity security events
  PERFORM public.log_security_event(
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'user_role_granted'
      WHEN TG_OP = 'UPDATE' THEN 'user_role_modified' 
      WHEN TG_OP = 'DELETE' THEN 'user_role_revoked'
    END,
    'high',
    jsonb_build_object(
      'operation', TG_OP,
      'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
      'old_role', CASE WHEN OLD IS NOT NULL THEN OLD.role ELSE NULL END,
      'new_role', CASE WHEN NEW IS NOT NULL THEN NEW.role ELSE NULL END,
      'changed_by', auth.uid(),
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for user_roles audit
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_changes();

-- Enhance security monitoring function
CREATE OR REPLACE FUNCTION public.validate_business_hours_access()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow access during business hours (8 AM - 10 PM EST)
  -- This is a basic implementation - adjust timezone as needed
  RETURN EXTRACT(hour FROM now() AT TIME ZONE 'EST') BETWEEN 8 AND 22;
END;
$$;

-- Create function to detect suspicious activity patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(p_user_id uuid, p_action_count integer, p_time_window interval)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_actions integer;
BEGIN
  -- Count recent security events for this user
  SELECT COUNT(*) INTO recent_actions
  FROM public.security_events
  WHERE user_id = p_user_id
  AND timestamp > (now() - p_time_window);
  
  -- Return true if exceeding threshold
  RETURN recent_actions > p_action_count;
END;
$$;