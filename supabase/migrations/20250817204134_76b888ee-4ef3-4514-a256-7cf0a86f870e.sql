-- STEP 1: CRITICAL SECURITY REMEDIATION
-- Fix RLS policies for authentication token tables to prevent compromise

-- Enhanced security for oauth_state_tokens
DROP POLICY IF EXISTS "System can manage oauth tokens" ON public.oauth_state_tokens;
DROP POLICY IF EXISTS "Users can access their own oauth tokens" ON public.oauth_state_tokens;

CREATE POLICY "Strict oauth token management" 
ON public.oauth_state_tokens 
FOR ALL 
USING (
  -- Only allow access to own tokens and enforce expiration
  auth.uid() = user_id 
  AND expires_at > now() 
  AND used = false
);

-- Enhanced security for gmail_credentials with additional logging
CREATE OR REPLACE FUNCTION public.audit_gmail_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all gmail credential access attempts
  PERFORM public.log_security_event(
    'gmail_credentials_accessed',
    'high',
    jsonb_build_object(
      'operation', TG_OP,
      'user_id', COALESCE(NEW.user_id, OLD.user_id),
      'gmail_email', COALESCE(NEW.gmail_user_email, OLD.gmail_user_email),
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for gmail credentials auditing
DROP TRIGGER IF EXISTS audit_gmail_credentials_access ON public.gmail_credentials;
CREATE TRIGGER audit_gmail_credentials_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.gmail_credentials
  FOR EACH ROW EXECUTE FUNCTION public.audit_gmail_access();

-- Enhanced communication data protection
CREATE POLICY "Strict communication isolation" 
ON public.email_exchanges 
FOR ALL 
USING (
  auth.uid() = user_id 
  AND validate_session_security()
) 
WITH CHECK (
  auth.uid() = user_id
);

-- Enhanced agent chat protection
ALTER TABLE public.agent_client_chat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enhanced chat INSERT - owner only" ON public.agent_client_chat;
DROP POLICY IF EXISTS "Enhanced chat UPDATE - owner only" ON public.agent_client_chat;

CREATE POLICY "Ultra secure chat access" 
ON public.agent_client_chat 
FOR ALL 
USING (
  auth.uid() = user_id 
  AND validate_session_security()
) 
WITH CHECK (
  auth.uid() = user_id
);