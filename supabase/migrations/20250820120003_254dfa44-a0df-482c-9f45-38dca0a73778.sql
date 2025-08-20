-- Enhance Gmail credentials security with session validation
-- This adds an extra layer of security without breaking existing functionality

-- Drop and recreate Gmail credentials policy with session validation
DROP POLICY IF EXISTS "Simple gmail credentials access" ON public.gmail_credentials;

CREATE POLICY "Enhanced gmail credentials access" 
ON public.gmail_credentials 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND validate_session_security()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Add a simple security monitoring function for critical data access
CREATE OR REPLACE FUNCTION public.log_critical_access(
  p_table_name text,
  p_operation text,
  p_record_id uuid DEFAULT NULL
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only log if user is authenticated
  IF auth.uid() IS NOT NULL THEN
    PERFORM public.log_security_event(
      'critical_data_access',
      'medium',
      jsonb_build_object(
        'table', p_table_name,
        'operation', p_operation,
        'record_id', p_record_id,
        'user_id', auth.uid(),
        'timestamp', now()
      )
    );
  END IF;
END;
$$;

-- Add lightweight monitoring trigger for Gmail credentials (most sensitive)
CREATE OR REPLACE FUNCTION public.monitor_gmail_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log access to Gmail credentials for security monitoring
  PERFORM public.log_critical_access('gmail_credentials', TG_OP, COALESCE(NEW.id, OLD.id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for Gmail credentials monitoring
DROP TRIGGER IF EXISTS gmail_credentials_access_monitor ON public.gmail_credentials;
CREATE TRIGGER gmail_credentials_access_monitor
  AFTER INSERT OR UPDATE OR DELETE ON public.gmail_credentials
  FOR EACH ROW EXECUTE FUNCTION public.monitor_gmail_access();