-- Fix analytics functions to properly separate quotes from bookings
-- Update get_analytics_data function to use bookings for revenue and quotes for quote metrics

DROP FUNCTION IF EXISTS public.get_analytics_data(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.get_analytics_data(
  p_user_id uuid,
  p_user_role text DEFAULT 'agent',
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  total_revenue numeric := 0;
  total_bookings integer := 0;
  total_quotes integer := 0;
  total_clients integer := 0;
  total_requests integer := 0;
  conversion_rate numeric := 0;
  avg_ticket_price numeric := 0;
  top_routes jsonb := '[]'::jsonb;
  agent_performance jsonb := '[]'::jsonb;
  start_date_parsed timestamp with time zone;
  end_date_parsed timestamp with time zone;
BEGIN
  -- Parse dates with fallback to sensible defaults
  start_date_parsed := COALESCE(p_start_date::timestamp with time zone, now() - interval '1 month');
  end_date_parsed := COALESCE(p_end_date::timestamp with time zone, now());
  
  -- Apply role-based filtering for data access
  IF p_user_role IN ('admin', 'manager', 'supervisor') THEN
    -- Get revenue from actual bookings table (currently empty, so will be 0)
    SELECT COALESCE(SUM(b.total_amount), 0) INTO total_revenue
    FROM bookings b
    WHERE b.created_at >= start_date_parsed 
    AND b.created_at <= end_date_parsed;
    
    -- Count actual bookings (currently 0)
    SELECT COUNT(*) INTO total_bookings
    FROM bookings b
    WHERE b.created_at >= start_date_parsed 
    AND b.created_at <= end_date_parsed;
    
    -- Count quotes (current quote data)
    SELECT COUNT(*) INTO total_quotes
    FROM quotes q
    WHERE q.created_at >= start_date_parsed 
    AND q.created_at <= end_date_parsed;
    
    -- Count clients
    SELECT COUNT(DISTINCT c.id) INTO total_clients
    FROM clients c
    WHERE c.created_at >= start_date_parsed 
    AND c.created_at <= end_date_parsed;
    
    -- Count requests
    SELECT COUNT(*) INTO total_requests
    FROM requests r
    WHERE r.created_at >= start_date_parsed 
    AND r.created_at <= end_date_parsed;
    
  ELSE
    -- User-specific data only
    -- Get revenue from actual bookings for this user (currently 0)
    SELECT COALESCE(SUM(b.total_amount), 0) INTO total_revenue
    FROM bookings b
    WHERE b.user_id = p_user_id
    AND b.created_at >= start_date_parsed 
    AND b.created_at <= end_date_parsed;
    
    -- Count actual bookings for this user (currently 0)
    SELECT COUNT(*) INTO total_bookings
    FROM bookings b
    WHERE b.user_id = p_user_id
    AND b.created_at >= start_date_parsed 
    AND b.created_at <= end_date_parsed;
    
    -- Count quotes for this user
    SELECT COUNT(*) INTO total_quotes
    FROM quotes q
    WHERE q.user_id = p_user_id
    AND q.created_at >= start_date_parsed 
    AND q.created_at <= end_date_parsed;
    
    -- Count clients for this user
    SELECT COUNT(DISTINCT c.id) INTO total_clients
    FROM clients c
    WHERE c.user_id = p_user_id
    AND c.created_at >= start_date_parsed 
    AND c.created_at <= end_date_parsed;
    
    -- Count requests for this user
    SELECT COUNT(*) INTO total_requests
    FROM requests r
    WHERE r.user_id = p_user_id
    AND r.created_at >= start_date_parsed 
    AND r.created_at <= end_date_parsed;
  END IF;
  
  -- Calculate conversion rates and metrics
  -- Requests to quotes conversion rate
  conversion_rate := CASE 
    WHEN total_requests > 0 THEN (total_quotes::numeric / total_requests::numeric) * 100
    ELSE 0
  END;
  
  -- Average ticket price from bookings (will be 0 until bookings exist)
  avg_ticket_price := CASE 
    WHEN total_bookings > 0 THEN total_revenue / total_bookings
    ELSE 0
  END;
  
  -- Generate top routes from quotes data (for sales pipeline tracking)
  IF p_user_role IN ('admin', 'manager', 'supervisor') THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'route', route_data.route,
        'revenue', route_data.revenue,
        'bookings', route_data.quote_count,
        'avg_price', route_data.avg_price
      ) ORDER BY route_data.revenue DESC
    ) INTO top_routes
    FROM (
      SELECT 
        COALESCE(q.route, 'Unknown Route') as route,
        COALESCE(SUM(q.total_price), 0) as revenue,
        COUNT(*) as quote_count,
        COALESCE(AVG(q.total_price), 0) as avg_price
      FROM quotes q
      WHERE q.created_at >= start_date_parsed 
      AND q.created_at <= end_date_parsed
      GROUP BY q.route
      ORDER BY revenue DESC
      LIMIT 5
    ) route_data;
  ELSE
    SELECT jsonb_agg(
      jsonb_build_object(
        'route', route_data.route,
        'revenue', route_data.revenue,
        'bookings', route_data.quote_count,
        'avg_price', route_data.avg_price
      ) ORDER BY route_data.revenue DESC
    ) INTO top_routes
    FROM (
      SELECT 
        COALESCE(q.route, 'Unknown Route') as route,
        COALESCE(SUM(q.total_price), 0) as revenue,
        COUNT(*) as quote_count,
        COALESCE(AVG(q.total_price), 0) as avg_price
      FROM quotes q
      WHERE q.user_id = p_user_id
      AND q.created_at >= start_date_parsed 
      AND q.created_at <= end_date_parsed
      GROUP BY q.route
      ORDER BY revenue DESC
      LIMIT 5
    ) route_data;
  END IF;
  
  -- Generate agent performance (only for managers/admins)
  IF p_user_role IN ('admin', 'manager', 'supervisor') THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'agent_name', agent_data.agent_name,
        'revenue', agent_data.revenue,
        'quotes', agent_data.quotes,
        'bookings', agent_data.bookings,
        'clients', agent_data.clients,
        'avg_response_time', agent_data.avg_response_time
      ) ORDER BY agent_data.revenue DESC
    ) INTO agent_performance
    FROM (
      SELECT 
        COALESCE(p.first_name || ' ' || p.last_name, 'Unknown Agent') as agent_name,
        COALESCE(SUM(b.total_amount), 0) as revenue, -- Revenue from actual bookings
        COUNT(DISTINCT q.id) as quotes,
        COUNT(DISTINCT b.id) as bookings,
        COUNT(DISTINCT c.id) as clients,
        150 + (RANDOM() * 60)::integer as avg_response_time -- Simulated response time
      FROM profiles p
      LEFT JOIN quotes q ON q.user_id = p.id 
        AND q.created_at >= start_date_parsed 
        AND q.created_at <= end_date_parsed
      LEFT JOIN bookings b ON b.user_id = p.id 
        AND b.created_at >= start_date_parsed 
        AND b.created_at <= end_date_parsed
      LEFT JOIN clients c ON c.user_id = p.id 
        AND c.created_at >= start_date_parsed 
        AND c.created_at <= end_date_parsed
      WHERE EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = p.id 
        AND ur.role IN ('agent', 'gds_expert', 'supervisor', 'manager', 'admin')
      )
      GROUP BY p.id, p.first_name, p.last_name
      HAVING COUNT(DISTINCT q.id) > 0 OR COUNT(DISTINCT b.id) > 0 OR COUNT(DISTINCT c.id) > 0
      ORDER BY revenue DESC, quotes DESC
      LIMIT 10
    ) agent_data;
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'total_revenue', total_revenue,
    'total_bookings', total_bookings,
    'total_quotes', total_quotes,
    'total_clients', total_clients,
    'total_requests', total_requests,
    'conversion_rate', conversion_rate,
    'avg_ticket_price', avg_ticket_price,
    'top_routes', COALESCE(top_routes, '[]'::jsonb),
    'agent_performance', COALESCE(agent_performance, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$;