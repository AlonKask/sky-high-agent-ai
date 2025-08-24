-- Create test function to debug RPC connectivity
CREATE OR REPLACE FUNCTION public.test_function_connectivity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Function connectivity test passed',
    'timestamp', now(),
    'user_authenticated', auth.uid() IS NOT NULL,
    'user_id', auth.uid()
  );
END;
$function$