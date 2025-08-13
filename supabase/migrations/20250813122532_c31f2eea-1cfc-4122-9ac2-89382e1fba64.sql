-- Phase 1 Continuation: Fix Gmail credential function dependencies

-- Drop the dependent Gmail policies first
DROP POLICY IF EXISTS "Enhanced gmail SELECT - strict owner only" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Enhanced gmail UPDATE - strict owner only" ON public.gmail_credentials;

-- Drop the function
DROP FUNCTION IF EXISTS public.can_access_gmail_credentials_enhanced(uuid);

-- Recreate the function
CREATE OR REPLACE FUNCTION public.can_access_gmail_credentials_enhanced(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accessing_user_id uuid := auth.uid();
BEGIN
  -- Deny if not authenticated
  IF accessing_user_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- STRICT: Users can ONLY access their own Gmail credentials
  IF accessing_user_id = target_user_id THEN
    RETURN true;
  END IF;
  
  -- Log unauthorized access attempts
  PERFORM public.log_security_event(
    'unauthorized_gmail_credentials_access',
    'critical',
    jsonb_build_object(
      'accessing_user_id', accessing_user_id,
      'target_user_id', target_user_id
    )
  );
  
  RETURN false;
END;
$$;

-- Recreate the Gmail credential policies
CREATE POLICY "Enhanced gmail SELECT - strict owner only"
ON public.gmail_credentials
FOR SELECT
TO authenticated
USING (can_access_gmail_credentials_enhanced(user_id));

CREATE POLICY "Enhanced gmail UPDATE - strict owner only"
ON public.gmail_credentials
FOR UPDATE
TO authenticated
USING (can_access_gmail_credentials_enhanced(user_id))
WITH CHECK (auth.uid() = user_id);

-- Add comprehensive audit triggers for sensitive operations
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all operations on sensitive tables
  PERFORM public.log_security_event(
    'sensitive_table_operation',
    CASE 
      WHEN TG_OP = 'DELETE' THEN 'high'
      WHEN TG_OP = 'UPDATE' THEN 'medium'
      ELSE 'low'
    END,
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'user_id', auth.uid(),
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to critical tables
DROP TRIGGER IF EXISTS audit_clients_operations ON public.clients;
CREATE TRIGGER audit_clients_operations
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

DROP TRIGGER IF EXISTS audit_gmail_credentials_operations ON public.gmail_credentials;
CREATE TRIGGER audit_gmail_credentials_operations  
AFTER INSERT OR UPDATE OR DELETE ON public.gmail_credentials
FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

DROP TRIGGER IF EXISTS audit_email_exchanges_operations ON public.email_exchanges;
CREATE TRIGGER audit_email_exchanges_operations
AFTER INSERT OR UPDATE OR DELETE ON public.email_exchanges
FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();