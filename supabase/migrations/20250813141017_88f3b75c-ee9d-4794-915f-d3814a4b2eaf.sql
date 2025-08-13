-- Enhance profiles table security with stricter RLS policies
-- First, drop existing policies to replace them with more secure versions
DROP POLICY IF EXISTS "Authenticated users: profiles SELECT" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users: profiles INSERT" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users: profiles UPDATE" ON public.profiles;
DROP POLICY IF EXISTS "DENY all anonymous access to profiles" ON public.profiles;

-- Create ultra-strict RLS policies for profiles table
-- 1. Absolute denial of anonymous access
CREATE POLICY "ABSOLUTE_DENY_anonymous_access_to_profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- 2. Users can only view their own profile
CREATE POLICY "ZERO_TRUST_profiles_select" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- 3. Users can only insert their own profile
CREATE POLICY "ZERO_TRUST_profiles_insert" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
  AND email IS NOT NULL
  AND first_name IS NOT NULL
  AND last_name IS NOT NULL
);

-- 4. Users can only update their own profile
CREATE POLICY "ZERO_TRUST_profiles_update" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- 5. Create security function to validate profile access
CREATE OR REPLACE FUNCTION public.can_access_profile_ultra_strict(profile_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    auth.uid() IS NOT NULL 
    AND auth.uid() = profile_user_id;
$$;

-- 6. Add trigger to log unauthorized profile access attempts
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access to profiles for security monitoring
  IF auth.uid() IS NULL THEN
    -- Critical: Anonymous access attempt
    PERFORM public.log_security_event(
      'anonymous_profile_access_blocked',
      'critical',
      jsonb_build_object(
        'table', 'profiles',
        'profile_id', COALESCE(NEW.id, OLD.id),
        'operation', TG_OP,
        'blocked', true
      )
    );
  ELSIF auth.uid() != COALESCE(NEW.id, OLD.id) THEN
    -- High: Cross-user access attempt
    PERFORM public.log_security_event(
      'cross_user_profile_access_blocked',
      'high',
      jsonb_build_object(
        'table', 'profiles',
        'profile_id', COALESCE(NEW.id, OLD.id),
        'accessing_user', auth.uid(),
        'operation', TG_OP,
        'blocked', true
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers for each operation type
DROP TRIGGER IF EXISTS audit_profile_select_trigger ON public.profiles;
DROP TRIGGER IF EXISTS audit_profile_insert_trigger ON public.profiles;
DROP TRIGGER IF EXISTS audit_profile_update_trigger ON public.profiles;
DROP TRIGGER IF EXISTS audit_profile_delete_trigger ON public.profiles;

CREATE TRIGGER audit_profile_insert_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_access();

CREATE TRIGGER audit_profile_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_access();

CREATE TRIGGER audit_profile_delete_trigger
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_access();

-- Add additional constraint to ensure profile data integrity
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_data_integrity_check 
CHECK (
  email IS NOT NULL AND email != '' AND
  first_name IS NOT NULL AND first_name != '' AND
  last_name IS NOT NULL AND last_name != ''
);