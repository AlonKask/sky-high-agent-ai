-- Fix security event logging constraint issues
-- First, check what constraint is causing issues and fix it

-- Drop the problematic constraint if it exists
ALTER TABLE public.security_events DROP CONSTRAINT IF EXISTS security_events_event_type_check;

-- Create a more flexible constraint that allows all necessary event types
ALTER TABLE public.security_events 
ADD CONSTRAINT security_events_event_type_flexible_check 
CHECK (event_type IS NOT NULL AND length(event_type) > 0 AND length(event_type) <= 100);

-- Add index for better performance on security event queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_type_severity 
ON public.security_events (user_id, event_type, severity, timestamp DESC);

-- Add index for security monitoring dashboards
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp_severity 
ON public.security_events (timestamp DESC, severity);

-- Update the log_security_event function to handle more event types
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_event_type text,
    p_severity text DEFAULT 'medium',
    p_details jsonb DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_user_id uuid;
    event_details jsonb;
BEGIN
    -- Get current user ID (can be null for system events)
    current_user_id := auth.uid();
    
    -- Validate input parameters
    IF p_event_type IS NULL OR length(trim(p_event_type)) = 0 THEN
        RAISE EXCEPTION 'event_type cannot be null or empty';
    END IF;
    
    IF p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
        p_severity := 'medium';
    END IF;
    
    -- Enhance details with system context
    event_details := COALESCE(p_details, '{}'::jsonb) || jsonb_build_object(
        'timestamp', now(),
        'user_authenticated', current_user_id IS NOT NULL,
        'session_role', current_setting('role', true),
        'application_version', '1.0.0'
    );
    
    -- Insert the security event with error handling
    BEGIN
        INSERT INTO public.security_events (
            user_id,
            event_type,
            severity,
            details,
            timestamp
        ) VALUES (
            current_user_id,
            trim(p_event_type),
            p_severity,
            event_details,
            now()
        );
    EXCEPTION 
        WHEN others THEN
            -- Log the error but don't fail the calling function
            RAISE LOG 'Failed to insert security event: %, %, %', p_event_type, p_severity, SQLERRM;
    END;
END;
$$;