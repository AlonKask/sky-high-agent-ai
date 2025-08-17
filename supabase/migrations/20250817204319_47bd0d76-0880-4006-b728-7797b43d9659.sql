-- Fix security warning: Function Search Path Mutable
-- Set search_path for security definer functions

-- Fix audit_gmail_access function
CREATE OR REPLACE FUNCTION public.audit_gmail_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
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
$$;