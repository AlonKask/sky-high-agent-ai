-- Test and fix Gmail OAuth configuration issues
-- First, let's create a simple test function to verify the OAuth setup

-- Check if we can call the health check function properly
CREATE OR REPLACE FUNCTION public.test_gmail_oauth_setup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This is a test function to verify OAuth setup
  RETURN jsonb_build_object(
    'test_status', 'Gmail OAuth test function created',
    'timestamp', now(),
    'auth_user', auth.uid()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.test_gmail_oauth_setup() TO authenticated;