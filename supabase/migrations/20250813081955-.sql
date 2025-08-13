-- Fix critical RLS policy issues

-- 1. Add RLS policies for gmail_integration_status view
-- First drop existing permissive policies on oauth_state_tokens
DROP POLICY IF EXISTS "System can manage oauth state tokens" ON public.oauth_state_tokens;

-- Add proper user-specific policies for oauth_state_tokens
CREATE POLICY "Users can view their own oauth tokens"
ON public.oauth_state_tokens
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create oauth tokens"
ON public.oauth_state_tokens
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update oauth tokens"
ON public.oauth_state_tokens
FOR UPDATE
USING (true);

CREATE POLICY "System can delete expired tokens"
ON public.oauth_state_tokens
FOR DELETE
USING (expires_at < now() OR used = true);

-- 2. Add RLS policies for gmail_integration_status view
-- Enable RLS on the underlying view (if it's a materialized view)
-- Note: Regular views inherit RLS from underlying tables, but we ensure proper access

-- Create a security function to check gmail integration access
CREATE OR REPLACE FUNCTION public.can_access_gmail_integration(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- User can access their own integration
    auth.uid() = target_user_id
    OR
    -- Admins and managers can access team integrations
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager', 'supervisor')
    );
$$;

-- Add RLS policy for gmail_credentials to ensure proper access control
CREATE POLICY "Users can access gmail integration based on permissions"
ON public.gmail_credentials
FOR SELECT
USING (public.can_access_gmail_integration(user_id));

-- 3. Enhance security event logging for failed access attempts
CREATE OR REPLACE FUNCTION public.log_failed_access_attempt(
  p_resource text,
  p_attempted_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.log_security_event(
    'unauthorized_access_attempt',
    'high',
    jsonb_build_object(
      'resource', p_resource,
      'attempted_user_id', p_attempted_user_id,
      'actual_user_id', auth.uid(),
      'timestamp', now()
    )
  );
END;
$$;