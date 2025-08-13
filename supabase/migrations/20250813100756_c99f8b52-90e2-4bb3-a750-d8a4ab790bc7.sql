-- Fix security linter warnings: Function Search Path Mutable
-- Setting proper search_path for security functions

-- Fix audit_gmail_credentials_access function
CREATE OR REPLACE FUNCTION public.audit_gmail_credentials_access()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all Gmail credential access attempts (INSERT, UPDATE, DELETE only)
  INSERT INTO public.security_events (
    user_id, event_type, severity, details
  ) VALUES (
    auth.uid(),
    'gmail_credentials_accessed',
    'high',
    jsonb_build_object(
      'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
      'operation', TG_OP,
      'has_encrypted_tokens', (COALESCE(NEW.access_token_encrypted, OLD.access_token_encrypted) IS NOT NULL),
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix audit_quote_financial_access function
CREATE OR REPLACE FUNCTION public.audit_quote_financial_access()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, severity, details
  ) VALUES (
    auth.uid(),
    'financial_data_accessed',
    'high',
    jsonb_build_object(
      'table', 'quotes',
      'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
      'operation', TG_OP,
      'has_financial_data', true,
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix audit_archive_access function
CREATE OR REPLACE FUNCTION public.audit_archive_access()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log archive modifications for compliance
  INSERT INTO public.security_events (
    user_id, event_type, severity, details
  ) VALUES (
    auth.uid(),
    'communication_archive_modified',
    'medium',
    jsonb_build_object(
      'archive_id', COALESCE(NEW.id, OLD.id),
      'communication_type', COALESCE(NEW.communication_type, OLD.communication_type),
      'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
      'operation', TG_OP,
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix audit_email_exchange_access function
CREATE OR REPLACE FUNCTION public.audit_email_exchange_access()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log sensitive email operations
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    INSERT INTO public.security_events (
      user_id, event_type, severity, details
    ) VALUES (
      auth.uid(),
      'email_communication_modified',
      'medium',
      jsonb_build_object(
        'email_id', OLD.id,
        'direction', OLD.direction,
        'operation', TG_OP,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;