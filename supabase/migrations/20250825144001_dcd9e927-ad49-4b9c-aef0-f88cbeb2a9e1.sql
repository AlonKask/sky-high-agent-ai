-- PHASE 1: Fix Missing Database Trigger
-- Attach the validation trigger to gmail_credentials table
CREATE OR REPLACE TRIGGER gmail_credentials_validation_trigger
    BEFORE INSERT OR UPDATE ON public.gmail_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_gmail_credentials_security();

-- Test that service role can insert credentials (fix RLS if needed)
-- Add logging for successful operations
CREATE OR REPLACE FUNCTION public.log_oauth_operation(
    p_user_id uuid,
    p_operation text,
    p_success boolean,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.security_events (
        user_id,
        event_type,
        severity,
        details
    ) VALUES (
        p_user_id,
        'oauth_' || p_operation,
        CASE WHEN p_success THEN 'low' ELSE 'high' END,
        p_details || jsonb_build_object(
            'operation', p_operation,
            'success', p_success,
            'timestamp', now()
        )
    );
END;
$$;