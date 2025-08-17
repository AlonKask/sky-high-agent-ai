-- PHASE 1: Enhanced Financial Data Protection
CREATE OR REPLACE FUNCTION public.secure_financial_data_access(
  p_table_name text,
  p_record_id uuid,
  p_operation text,
  p_justification text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  owner_id uuid;
  access_granted boolean := false;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Get record owner based on table
  IF p_table_name = 'quotes' THEN
    SELECT user_id INTO owner_id FROM public.quotes WHERE id = p_record_id;
  ELSIF p_table_name = 'bookings' THEN
    SELECT user_id INTO owner_id FROM public.bookings WHERE id = p_record_id;
  ELSE
    RETURN false;
  END IF;
  
  -- Access control logic
  IF auth.uid() = owner_id THEN
    access_granted := true;
  ELSIF user_role IN ('admin', 'manager', 'supervisor') THEN
    access_granted := true;
    -- Log elevated access
    PERFORM public.log_security_event(
      'elevated_financial_access',
      'high',
      jsonb_build_object(
        'table', p_table_name,
        'record_id', p_record_id,
        'operation', p_operation,
        'user_role', user_role,
        'justification', p_justification
      )
    );
  END IF;
  
  -- Always log financial data access
  PERFORM public.log_security_event(
    'financial_data_access',
    CASE WHEN access_granted THEN 'medium' ELSE 'high' END,
    jsonb_build_object(
      'table', p_table_name,
      'record_id', p_record_id,
      'operation', p_operation,
      'access_granted', access_granted,
      'owner_id', owner_id
    )
  );
  
  RETURN access_granted;
END;
$function$;

-- PHASE 2: Enhanced Communication Privacy
CREATE OR REPLACE FUNCTION public.secure_communication_access(
  p_user_id uuid,
  p_client_id uuid DEFAULT NULL,
  p_operation text DEFAULT 'SELECT'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  is_participant boolean := false;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Check if user is involved in communication
  IF auth.uid() = p_user_id THEN
    is_participant := true;
  ELSIF p_client_id IS NOT NULL THEN
    -- Check if user owns the client
    SELECT EXISTS(
      SELECT 1 FROM public.clients 
      WHERE id = p_client_id AND user_id = auth.uid()
    ) INTO is_participant;
  END IF;
  
  -- Allow access for participants or elevated roles
  IF is_participant OR user_role IN ('admin', 'manager', 'supervisor') THEN
    -- Log communication access
    PERFORM public.log_security_event(
      'communication_access',
      CASE WHEN is_participant THEN 'low' ELSE 'medium' END,
      jsonb_build_object(
        'target_user_id', p_user_id,
        'client_id', p_client_id,
        'operation', p_operation,
        'is_participant', is_participant,
        'user_role', user_role
      )
    );
    RETURN true;
  END IF;
  
  -- Log unauthorized access attempt
  PERFORM public.log_security_event(
    'unauthorized_communication_access',
    'critical',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'client_id', p_client_id,
      'operation', p_operation
    )
  );
  
  RETURN false;
END;
$function$;

-- PHASE 3: Enhanced Authentication Token Security
CREATE OR REPLACE FUNCTION public.secure_token_access(
  p_target_user_id uuid,
  p_token_type text DEFAULT 'gmail'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  suspicious_activity boolean := false;
BEGIN
  -- Only allow users to access their own tokens
  IF auth.uid() != p_target_user_id THEN
    -- Check for admin override
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = auth.uid();
    
    IF user_role != 'admin' THEN
      -- Log critical security violation
      PERFORM public.log_security_event(
        'unauthorized_token_access_attempt',
        'critical',
        jsonb_build_object(
          'target_user_id', p_target_user_id,
          'token_type', p_token_type,
          'attempted_by', auth.uid()
        )
      );
      RETURN false;
    END IF;
    
    -- Log admin token access
    PERFORM public.log_security_event(
      'admin_token_access',
      'critical',
      jsonb_build_object(
        'target_user_id', p_target_user_id,
        'token_type', p_token_type,
        'admin_id', auth.uid(),
        'requires_justification', true
      )
    );
  END IF;
  
  -- Check for suspicious activity patterns
  SELECT COUNT(*) > 5 INTO suspicious_activity
  FROM public.security_events
  WHERE user_id = auth.uid()
  AND event_type LIKE '%token%'
  AND timestamp > now() - interval '1 hour';
  
  IF suspicious_activity THEN
    PERFORM public.log_security_event(
      'suspicious_token_activity',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'token_type', p_token_type,
        'activity_pattern', 'high_frequency_access'
      )
    );
  END IF;
  
  -- Log token access
  PERFORM public.log_security_event(
    'token_access',
    CASE WHEN suspicious_activity THEN 'high' ELSE 'medium' END,
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'token_type', p_token_type,
      'suspicious_activity', suspicious_activity
    )
  );
  
  RETURN true;
END;
$function$;

-- PHASE 4: Update RLS Policies for Enhanced Security

-- Enhanced Quotes Security
DROP POLICY IF EXISTS "Users can create their own quotes only" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes only" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes only" ON public.quotes;

CREATE POLICY "SECURE_quotes_select" ON public.quotes
FOR SELECT USING (
  secure_financial_data_access('quotes', id, 'SELECT')
);

CREATE POLICY "SECURE_quotes_insert" ON public.quotes
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  secure_financial_data_access('quotes', id, 'INSERT')
);

CREATE POLICY "SECURE_quotes_update" ON public.quotes
FOR UPDATE USING (
  secure_financial_data_access('quotes', id, 'UPDATE')
) WITH CHECK (
  secure_financial_data_access('quotes', id, 'UPDATE')
);

CREATE POLICY "SECURE_quotes_delete" ON public.quotes
FOR DELETE USING (
  secure_financial_data_access('quotes', id, 'DELETE')
);

-- Enhanced Email Security
DROP POLICY IF EXISTS "Users can manage their own emails" ON public.email_exchanges;
DROP POLICY IF EXISTS "Users can view their own emails" ON public.email_exchanges;

CREATE POLICY "SECURE_emails_select" ON public.email_exchanges
FOR SELECT USING (
  secure_communication_access(user_id, client_id, 'SELECT')
);

CREATE POLICY "SECURE_emails_insert" ON public.email_exchanges
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  secure_communication_access(user_id, client_id, 'INSERT')
);

CREATE POLICY "SECURE_emails_update" ON public.email_exchanges
FOR UPDATE USING (
  secure_communication_access(user_id, client_id, 'UPDATE')
) WITH CHECK (
  secure_communication_access(user_id, client_id, 'UPDATE')
);

-- Enhanced Gmail Credentials Security
DROP POLICY IF EXISTS "ULTRA_SECURE_gmail_select" ON public.gmail_credentials;
DROP POLICY IF EXISTS "ULTRA_SECURE_gmail_insert" ON public.gmail_credentials;
DROP POLICY IF EXISTS "ULTRA_SECURE_gmail_update" ON public.gmail_credentials;
DROP POLICY IF EXISTS "ULTRA_SECURE_gmail_delete" ON public.gmail_credentials;

CREATE POLICY "MILITARY_GRADE_gmail_select" ON public.gmail_credentials
FOR SELECT USING (
  secure_token_access(user_id, 'gmail')
);

CREATE POLICY "MILITARY_GRADE_gmail_insert" ON public.gmail_credentials
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  secure_token_access(user_id, 'gmail') AND
  access_token_encrypted IS NOT NULL AND
  refresh_token_encrypted IS NOT NULL
);

CREATE POLICY "MILITARY_GRADE_gmail_update" ON public.gmail_credentials
FOR UPDATE USING (
  secure_token_access(user_id, 'gmail')
) WITH CHECK (
  auth.uid() = user_id AND
  secure_token_access(user_id, 'gmail')
);

CREATE POLICY "MILITARY_GRADE_gmail_delete" ON public.gmail_credentials
FOR DELETE USING (
  secure_token_access(user_id, 'gmail')
);

-- Enhanced Booking Security
CREATE POLICY "SECURE_bookings_select" ON public.bookings
FOR SELECT USING (
  secure_financial_data_access('bookings', id, 'SELECT')
);

CREATE POLICY "SECURE_bookings_insert" ON public.bookings
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  secure_financial_data_access('bookings', id, 'INSERT')
);

CREATE POLICY "SECURE_bookings_update" ON public.bookings
FOR UPDATE USING (
  secure_financial_data_access('bookings', id, 'UPDATE')
) WITH CHECK (
  secure_financial_data_access('bookings', id, 'UPDATE')
);

CREATE POLICY "SECURE_bookings_delete" ON public.bookings
FOR DELETE USING (
  secure_financial_data_access('bookings', id, 'DELETE')
);