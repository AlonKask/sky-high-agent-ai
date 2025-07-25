-- Add missing performance indexes (without CONCURRENTLY to avoid transaction block error)
CREATE INDEX IF NOT EXISTS idx_email_exchanges_user_created 
ON email_exchanges(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_user_status 
ON bookings(user_id, status);

CREATE INDEX IF NOT EXISTS idx_clients_user_email 
ON clients(user_id, email);

CREATE INDEX IF NOT EXISTS idx_requests_user_status 
ON requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_quotes_user_status 
ON quotes(user_id, status);

-- Add production health check function
CREATE OR REPLACE FUNCTION public.health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  db_time timestamp;
  table_count integer;
BEGIN
  -- Check database connectivity and basic operations
  SELECT now() INTO db_time;
  
  -- Count some tables to verify basic read access
  SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public';
  
  result := jsonb_build_object(
    'status', 'healthy',
    'timestamp', db_time,
    'database', 'connected',
    'table_count', table_count,
    'version', '1.0.0'
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'error',
    'message', SQLERRM,
    'timestamp', now()
  );
END;
$$;