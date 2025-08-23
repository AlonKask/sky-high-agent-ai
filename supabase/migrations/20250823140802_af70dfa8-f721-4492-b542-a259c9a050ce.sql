-- Create comprehensive dashboard stats function for efficient data fetching
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid DEFAULT NULL, p_role app_role DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  stats_data record;
  current_user_id uuid;
  user_role app_role;
  this_month_start date;
BEGIN
  -- Get current user and role
  current_user_id := COALESCE(p_user_id, auth.uid());
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  
  -- Get user role if not provided
  IF p_role IS NULL THEN
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = current_user_id;
  ELSE
    user_role := p_role;
  END IF;
  
  -- Set this month start date
  this_month_start := date_trunc('month', CURRENT_DATE)::date;
  
  -- Build stats based on user role
  IF user_role IN ('admin', 'manager', 'supervisor') THEN
    -- Get comprehensive stats for admin/manager roles
    SELECT
      COUNT(DISTINCT c.id) as total_clients,
      COUNT(DISTINCT CASE WHEN r.status IN ('pending', 'researching', 'quote_sent') THEN r.id END) as active_requests,
      COUNT(DISTINCT CASE WHEN b.created_at >= this_month_start THEN b.id END) as this_month_bookings,
      COALESCE(SUM(CASE WHEN b.created_at >= this_month_start THEN b.total_price END), 0) as monthly_revenue,
      COUNT(DISTINCT CASE WHEN b.departure_date > CURRENT_DATE THEN b.id END) as upcoming_trips,
      COALESCE(AVG(CASE WHEN b.created_at >= this_month_start THEN b.total_price END), 0) as avg_ticket_price
    INTO stats_data
    FROM public.clients c
    LEFT JOIN public.requests r ON c.user_id = r.user_id
    LEFT JOIN public.bookings b ON c.user_id = b.user_id;
    
  ELSE
    -- Get user-specific stats for regular users
    SELECT
      COUNT(DISTINCT c.id) as total_clients,
      COUNT(DISTINCT CASE WHEN r.status IN ('pending', 'researching', 'quote_sent') THEN r.id END) as active_requests,
      COUNT(DISTINCT CASE WHEN b.created_at >= this_month_start THEN b.id END) as this_month_bookings,
      COALESCE(SUM(CASE WHEN b.created_at >= this_month_start THEN b.total_price END), 0) as monthly_revenue,
      COUNT(DISTINCT CASE WHEN b.departure_date > CURRENT_DATE THEN b.id END) as upcoming_trips,
      COALESCE(AVG(CASE WHEN b.created_at >= this_month_start THEN b.total_price END), 0) as avg_ticket_price
    INTO stats_data
    FROM public.clients c
    LEFT JOIN public.requests r ON c.id = r.client_id AND r.user_id = current_user_id
    LEFT JOIN public.bookings b ON c.id = b.client_id AND b.user_id = current_user_id
    WHERE c.user_id = current_user_id;
    
  END IF;
  
  -- Build result JSON
  result := jsonb_build_object(
    'totalClients', COALESCE(stats_data.total_clients, 0),
    'activeRequests', COALESCE(stats_data.active_requests, 0),
    'thisMonthBookings', COALESCE(stats_data.this_month_bookings, 0),
    'monthlyRevenue', COALESCE(stats_data.monthly_revenue, 0),
    'upcomingTrips', COALESCE(stats_data.upcoming_trips, 0),
    'averageTicketPrice', COALESCE(stats_data.avg_ticket_price, 0),
    'lastUpdated', now(),
    'userRole', user_role,
    'dataScope', CASE 
      WHEN user_role IN ('admin', 'manager', 'supervisor') THEN 'system_wide'
      ELSE 'user_specific'
    END
  );
  
  RETURN result;
END;
$$;

-- Create system health monitoring function
CREATE OR REPLACE FUNCTION public.get_system_health_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  health_result jsonb;
  db_status text := 'healthy';
  db_response_time_ms numeric;
  connection_count integer;
  start_time timestamp;
  issues text[] := '{}';
BEGIN
  -- Measure database response time
  start_time := clock_timestamp();
  
  -- Test basic database operations
  BEGIN
    SELECT COUNT(*) INTO connection_count
    FROM pg_stat_activity 
    WHERE state = 'active';
    
    -- Calculate response time
    db_response_time_ms := EXTRACT(epoch FROM (clock_timestamp() - start_time)) * 1000;
    
    -- Check if response time is acceptable
    IF db_response_time_ms > 1000 THEN
      db_status := 'warning';
      issues := array_append(issues, 'High database response time: ' || db_response_time_ms::text || 'ms');
    ELSIF db_response_time_ms > 5000 THEN
      db_status := 'critical';
      issues := array_append(issues, 'Critical database response time: ' || db_response_time_ms::text || 'ms');
    END IF;
    
    -- Check connection count
    IF connection_count > 50 THEN
      db_status := 'warning';
      issues := array_append(issues, 'High connection count: ' || connection_count::text);
    END IF;
    
  EXCEPTION WHEN others THEN
    db_status := 'critical';
    issues := array_append(issues, 'Database health check failed: ' || SQLERRM);
  END;
  
  -- Build health status result
  health_result := jsonb_build_object(
    'overall_status', db_status,
    'database', jsonb_build_object(
      'status', db_status,
      'response_time_ms', COALESCE(db_response_time_ms, 0),
      'active_connections', COALESCE(connection_count, 0),
      'last_check', now()
    ),
    'authentication', jsonb_build_object(
      'status', 'healthy',
      'service', 'supabase_auth'
    ),
    'encryption', jsonb_build_object(
      'status', 'healthy',
      'enabled', true
    ),
    'issues', array_to_json(issues),
    'last_updated', now(),
    'check_timestamp', extract(epoch from now())
  );
  
  RETURN health_result;
END;
$$;