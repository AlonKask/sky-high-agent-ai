-- Drop and recreate get_analytics_data function with correct revenue calculation
DROP FUNCTION IF EXISTS public.get_analytics_data(text, text, uuid);

CREATE OR REPLACE FUNCTION public.get_analytics_data(
  p_start_date text DEFAULT NULL,
  p_end_date text DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL
)
RETURNS TABLE(
  total_revenue numeric,
  total_quotes integer,
  total_bookings integer,
  total_clients integer,
  conversion_rate numeric,
  avg_ticket_price numeric,
  pipeline_value numeric,
  monthly_data jsonb,
  top_routes jsonb,
  agent_performance jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  start_date_parsed date;
  end_date_parsed date;
  quote_count integer := 0;
  booking_count integer := 0;
  client_count integer := 0;
  actual_revenue_sum numeric := 0;
  pipeline_value_sum numeric := 0;
  avg_ticket numeric := 0;
  conv_rate numeric := 0;
  monthly_json jsonb := '[]'::jsonb;
  routes_json jsonb := '[]'::jsonb;
  agents_json jsonb := '[]'::jsonb;
BEGIN
  -- Parse dates with fallback to reasonable defaults
  BEGIN
    start_date_parsed := COALESCE(p_start_date::date, CURRENT_DATE - INTERVAL '30 days');
    end_date_parsed := COALESCE(p_end_date::date, CURRENT_DATE);
  EXCEPTION WHEN OTHERS THEN
    start_date_parsed := CURRENT_DATE - INTERVAL '30 days';
    end_date_parsed := CURRENT_DATE;
  END;

  -- Get actual revenue from bookings table (not quotes)
  SELECT COUNT(*), COALESCE(SUM(b.total_amount), 0)
  INTO booking_count, actual_revenue_sum
  FROM public.bookings b
  WHERE b.created_at::date BETWEEN start_date_parsed AND end_date_parsed
    AND (p_agent_id IS NULL OR b.user_id = p_agent_id);

  -- Get quote metrics (pipeline value)
  SELECT COUNT(*), COALESCE(SUM(total_price), 0)
  INTO quote_count, pipeline_value_sum
  FROM public.quotes q
  WHERE q.created_at::date BETWEEN start_date_parsed AND end_date_parsed
    AND (p_agent_id IS NULL OR q.user_id = p_agent_id);

  -- Get unique clients count
  SELECT COUNT(DISTINCT COALESCE(q.client_id, b.client_id))
  INTO client_count
  FROM public.quotes q
  FULL OUTER JOIN public.bookings b ON q.client_id = b.client_id
  WHERE (q.created_at::date BETWEEN start_date_parsed AND end_date_parsed
         OR b.created_at::date BETWEEN start_date_parsed AND end_date_parsed)
    AND (p_agent_id IS NULL OR COALESCE(q.user_id, b.user_id) = p_agent_id);

  -- Calculate metrics based on actual bookings
  avg_ticket := CASE WHEN booking_count > 0 THEN actual_revenue_sum / booking_count ELSE 0 END;
  conv_rate := CASE WHEN quote_count > 0 THEN (booking_count::numeric / quote_count::numeric) * 100 ELSE 0 END;

  -- Generate monthly data with both actual and pipeline revenue
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(month_date, 'Month YYYY'),
      'revenue', COALESCE(month_actual_revenue, 0),
      'pipeline_value', COALESCE(month_pipeline_value, 0),
      'quotes', COALESCE(month_quotes, 0),
      'bookings', COALESCE(month_bookings, 0)
    ) ORDER BY month_date
  )
  INTO monthly_json
  FROM (
    SELECT 
      date_trunc('month', month_series)::date AS month_date,
      COALESCE(SUM(b.total_amount), 0) AS month_actual_revenue,
      COALESCE(SUM(q.total_price), 0) AS month_pipeline_value,
      COUNT(q.id) AS month_quotes,
      COUNT(b.id) AS month_bookings
    FROM generate_series(start_date_parsed, end_date_parsed, '1 month'::interval) AS month_series
    LEFT JOIN public.quotes q ON date_trunc('month', q.created_at) = date_trunc('month', month_series)
      AND (p_agent_id IS NULL OR q.user_id = p_agent_id)
    LEFT JOIN public.bookings b ON date_trunc('month', b.created_at) = date_trunc('month', month_series)
      AND (p_agent_id IS NULL OR b.user_id = p_agent_id)
    GROUP BY month_date
  ) monthly_stats;

  -- Generate top routes from bookings (actual performance)
  SELECT jsonb_agg(
    jsonb_build_object(
      'route', route,
      'count', route_count,
      'revenue', route_revenue
    )
  )
  INTO routes_json
  FROM (
    SELECT 
      b.route,
      COUNT(*) as route_count,
      SUM(b.total_amount) as route_revenue
    FROM public.bookings b
    WHERE b.created_at::date BETWEEN start_date_parsed AND end_date_parsed
      AND (p_agent_id IS NULL OR b.user_id = p_agent_id)
      AND b.route IS NOT NULL
    GROUP BY b.route
    ORDER BY route_revenue DESC NULLS LAST
    LIMIT 10
  ) route_stats;

  -- Generate agent performance with actual vs pipeline
  IF p_agent_id IS NULL THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'agent_name', COALESCE(p.first_name || ' ' || p.last_name, 'Unknown'),
        'quotes', agent_quotes,
        'bookings', agent_bookings,
        'revenue', agent_actual_revenue,
        'pipeline_value', agent_pipeline_value
      )
    )
    INTO agents_json
    FROM (
      SELECT 
        COALESCE(q.user_id, b.user_id) as user_id,
        COUNT(q.*) as agent_quotes,
        COUNT(b.*) as agent_bookings,
        COALESCE(SUM(b.total_amount), 0) as agent_actual_revenue,
        COALESCE(SUM(q.total_price), 0) as agent_pipeline_value
      FROM public.quotes q
      FULL OUTER JOIN public.bookings b ON q.user_id = b.user_id 
        AND b.created_at::date BETWEEN start_date_parsed AND end_date_parsed
      WHERE q.created_at::date BETWEEN start_date_parsed AND end_date_parsed
      GROUP BY COALESCE(q.user_id, b.user_id)
      ORDER BY agent_actual_revenue DESC
      LIMIT 10
    ) agent_stats
    LEFT JOIN public.profiles p ON agent_stats.user_id = p.id;
  ELSE
    agents_json := '[]'::jsonb;
  END IF;

  -- Return the aggregated data (revenue is now actual booking revenue)
  RETURN QUERY SELECT 
    actual_revenue_sum,
    quote_count,
    booking_count,
    client_count,
    conv_rate,
    avg_ticket,
    pipeline_value_sum,
    COALESCE(monthly_json, '[]'::jsonb),
    COALESCE(routes_json, '[]'::jsonb),
    COALESCE(agents_json, '[]'::jsonb);
END;
$function$;