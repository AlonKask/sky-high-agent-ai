-- Fix log_security_event function to handle invalid user_id values
-- This prevents foreign key constraint violations when service role operations try to log events

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  final_user_id uuid;
  client_ip inet;
  client_user_agent text;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  final_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Validate that the user_id exists in auth.users table
  -- If not, skip logging or use NULL for system operations
  IF final_user_id IS NOT NULL THEN
    -- Check if user exists in auth.users (this query is allowed for security functions)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = final_user_id) THEN
      -- For service role operations or invalid user_ids, set to NULL
      final_user_id := NULL;
    END IF;
  END IF;
  
  -- Extract client info from request headers if available
  BEGIN
    client_ip := COALESCE(
      (current_setting('request.headers')::json->>'x-real-ip')::inet,
      (current_setting('request.headers')::json->>'x-forwarded-for')::inet,
      '127.0.0.1'::inet
    );
  EXCEPTION WHEN OTHERS THEN
    client_ip := '127.0.0.1'::inet;
  END;
  
  BEGIN
    client_user_agent := current_setting('request.headers')::json->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    client_user_agent := 'Unknown';
  END;
  
  -- Insert security event (user_id can be NULL for system operations)
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details,
    ip_address,
    user_agent,
    timestamp
  ) VALUES (
    final_user_id,  -- This can now be NULL without foreign key violation
    p_event_type,
    p_severity,
    p_details || jsonb_build_object(
      'client_ip', client_ip::text,
      'client_user_agent', client_user_agent,
      'server_timestamp', now(),
      'system_operation', (final_user_id IS NULL)
    ),
    client_ip,
    client_user_agent,
    now()
  );
  
  RETURN true;
  
EXCEPTION WHEN OTHERS THEN
  -- Don't let logging failures break the application
  RAISE WARNING 'Security event logging failed: %', SQLERRM;
  RETURN false;
END;
$$;

-- Update the security_events table to allow NULL user_id for system operations
ALTER TABLE public.security_events 
ALTER COLUMN user_id DROP NOT NULL;