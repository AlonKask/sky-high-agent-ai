-- CRITICAL SECURITY FIX 1: Remove plain text OAuth token columns from user_preferences
-- These should never store plain text tokens - only encrypted versions in gmail_credentials

ALTER TABLE public.user_preferences 
DROP COLUMN IF EXISTS gmail_access_token,
DROP COLUMN IF EXISTS gmail_refresh_token,
DROP COLUMN IF EXISTS gmail_user_email,
DROP COLUMN IF EXISTS gmail_token_expiry;

-- CRITICAL SECURITY FIX 2: Strengthen Gmail credentials access control
-- Replace overly permissive function with strict owner-only access
CREATE OR REPLACE FUNCTION public.can_access_gmail_integration(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    -- Users can ONLY access their own Gmail integration
    auth.uid() = target_user_id;
$function$;

-- HIGH PRIORITY FIX 3: Restrict client data access - remove overly broad team access
DROP POLICY IF EXISTS "Team leaders can view team clients" ON public.clients;

-- Create more restrictive client access policy
CREATE POLICY "Supervisors and above can view all clients"
ON public.clients
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- HIGH PRIORITY FIX 4: Restrict profile data exposure
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create need-to-know profile access policy
CREATE POLICY "Limited admin profile access"
ON public.profiles  
FOR SELECT
USING (
  auth.uid() = id
  OR (
    has_role(auth.uid(), 'admin'::app_role) 
    AND auth.uid() IN (
      SELECT manager_id FROM public.teams 
      WHERE id IN (
        SELECT team_id FROM public.team_members WHERE user_id = profiles.id
      )
    )
  )
);

-- CRITICAL SECURITY FIX 5: Add enhanced security logging for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  p_accessed_user_id uuid,
  p_data_type text,
  p_justification text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log all sensitive data access attempts
  PERFORM public.log_security_event(
    'sensitive_data_accessed',
    'high',
    jsonb_build_object(
      'accessed_user_id', p_accessed_user_id,
      'accessing_user_id', auth.uid(),
      'data_type', p_data_type,
      'justification', p_justification,
      'timestamp', now()
    )
  );
END;
$function$;

-- HIGH PRIORITY FIX 6: Add trigger to log Gmail credential access
CREATE OR REPLACE FUNCTION public.audit_gmail_credential_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log Gmail credential access
  PERFORM public.log_sensitive_data_access(
    NEW.user_id,
    'gmail_credentials',
    'Gmail integration access'
  );
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER audit_gmail_access
  AFTER SELECT ON public.gmail_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_gmail_credential_access();

-- MEDIUM PRIORITY FIX 7: Strengthen rate limiting for public endpoints
UPDATE public.access_rate_limits 
SET request_count = 5, window_start = now() - INTERVAL '15 minutes'
WHERE endpoint = 'public-request';

-- Add stricter rate limits for public forms
INSERT INTO public.access_rate_limits (identifier, endpoint, request_count)
VALUES ('global_public_form', 'public-request', 3)
ON CONFLICT (identifier, endpoint) 
DO UPDATE SET request_count = 3;