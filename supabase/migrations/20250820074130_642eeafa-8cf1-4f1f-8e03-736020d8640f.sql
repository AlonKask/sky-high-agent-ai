-- Security Fix 1: Clean up conflicting RLS policies on clients table
-- Remove redundant policies and create clear, secure access patterns

-- First, drop all existing conflicting policies on clients table
DROP POLICY IF EXISTS "Secure clients access" ON public.clients;
DROP POLICY IF EXISTS "Secure clients delete" ON public.clients;
DROP POLICY IF EXISTS "Secure clients modification" ON public.clients;
DROP POLICY IF EXISTS "Secure clients update" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;

-- Create new consolidated, secure RLS policies for clients
CREATE POLICY "clients_select_own_data_only" ON public.clients
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clients_insert_own_data_only" ON public.clients
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_update_own_data_only" ON public.clients
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_delete_own_data_only" ON public.clients
FOR DELETE USING (auth.uid() = user_id);

-- Security Fix 2: Clean up and strengthen quotes table RLS
-- Remove existing policies and create comprehensive financial data protection
DROP POLICY IF EXISTS "Secure quotes access" ON public.quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;

-- Create secure quotes policies with financial data protection
CREATE POLICY "quotes_select_own_data_only" ON public.quotes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "quotes_insert_own_data_only" ON public.quotes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotes_update_own_data_only" ON public.quotes
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotes_delete_own_data_only" ON public.quotes
FOR DELETE USING (auth.uid() = user_id);

-- Security Fix 3: Add comprehensive audit logging for sensitive operations
CREATE OR REPLACE FUNCTION public.log_sensitive_operation(
  p_operation_type text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all sensitive operations with detailed context
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    auth.uid(),
    'sensitive_operation',
    CASE 
      WHEN p_table_name IN ('clients', 'quotes') THEN 'high'
      ELSE 'medium'
    END,
    jsonb_build_object(
      'operation_type', p_operation_type,
      'table_name', p_table_name,
      'record_id', p_record_id,
      'user_authenticated', auth.uid() IS NOT NULL,
      'timestamp', now(),
      'session_info', jsonb_build_object(
        'role', current_setting('role', true),
        'application_name', current_setting('application_name', true)
      )
    ) || p_details
  );
END;
$$;

-- Security Fix 4: Create comprehensive rate limiting function
CREATE OR REPLACE FUNCTION public.check_advanced_rate_limit(
  p_user_id text,
  p_action_type text,
  p_max_requests integer DEFAULT 10,
  p_window_seconds integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_count integer;
  window_start timestamp;
BEGIN
  -- Calculate window start time
  window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  -- Count recent requests for this user and action type
  SELECT COUNT(*) INTO request_count
  FROM public.security_events
  WHERE user_id::text = p_user_id
    AND event_type = p_action_type
    AND timestamp >= window_start;
  
  -- Log rate limit check
  IF request_count >= p_max_requests THEN
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      'high',
      jsonb_build_object(
        'user_id', p_user_id,
        'action_type', p_action_type,
        'request_count', request_count,
        'max_requests', p_max_requests,
        'window_seconds', p_window_seconds
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Security Fix 5: Create function to validate business hours access
CREATE OR REPLACE FUNCTION public.validate_business_hours_access()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_hour integer;
  current_day integer;
BEGIN
  -- Get current hour (0-23) and day of week (0=Sunday, 6=Saturday)
  current_hour := EXTRACT(hour FROM now() AT TIME ZONE 'UTC');
  current_day := EXTRACT(dow FROM now() AT TIME ZONE 'UTC');
  
  -- Allow access during business hours (9 AM - 6 PM UTC, Monday-Friday)
  -- This is a basic implementation - adjust based on business needs
  IF current_day BETWEEN 1 AND 5 AND current_hour BETWEEN 9 AND 18 THEN
    RETURN true;
  END IF;
  
  -- Log after-hours access attempt
  PERFORM public.log_security_event(
    'after_hours_access',
    'medium',
    jsonb_build_object(
      'current_hour', current_hour,
      'current_day', current_day,
      'timestamp', now()
    )
  );
  
  RETURN false;
END;
$$;

-- Security Fix 6: Enhanced audit trigger for client operations
CREATE OR REPLACE FUNCTION public.enhanced_client_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all client data operations with enhanced context
  PERFORM public.log_sensitive_operation(
    TG_OP,
    'clients',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'client_email', COALESCE(NEW.email, OLD.email),
      'operation_time', now(),
      'has_sensitive_data', (
        COALESCE(NEW.encrypted_ssn, OLD.encrypted_ssn) IS NOT NULL OR
        COALESCE(NEW.encrypted_passport_number, OLD.encrypted_passport_number) IS NOT NULL OR
        COALESCE(NEW.encrypted_payment_info, OLD.encrypted_payment_info) IS NOT NULL
      )
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply enhanced audit trigger to clients table
DROP TRIGGER IF EXISTS enhanced_client_audit ON public.clients;
CREATE TRIGGER enhanced_client_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_client_audit_trigger();

-- Security Fix 7: Enhanced audit trigger for quotes (financial data)
CREATE OR REPLACE FUNCTION public.enhanced_quotes_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all financial data operations with enhanced context
  PERFORM public.log_sensitive_operation(
    TG_OP,
    'quotes',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'client_id', COALESCE(NEW.client_id, OLD.client_id),
      'total_price', COALESCE(NEW.total_price, OLD.total_price),
      'net_price', COALESCE(NEW.net_price, OLD.net_price),
      'markup', COALESCE(NEW.markup, OLD.markup),
      'financial_sensitivity', COALESCE(NEW.financial_sensitivity, OLD.financial_sensitivity)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply enhanced audit trigger to quotes table
DROP TRIGGER IF EXISTS enhanced_quotes_audit ON public.quotes;
CREATE TRIGGER enhanced_quotes_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_quotes_audit_trigger();