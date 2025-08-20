-- ENHANCED SECURITY: Address remaining role-based access concerns
-- Add audit logging and stricter controls for sensitive data access

-- Create enhanced access logging function for client data
CREATE OR REPLACE FUNCTION public.log_client_data_access(
  p_client_id uuid,
  p_access_type text,
  p_justification text DEFAULT 'routine_access'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log all client data access for security monitoring
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    auth.uid(),
    'client_data_accessed',
    CASE 
      WHEN auth.uid() = (SELECT user_id FROM public.clients WHERE id = p_client_id) THEN 'low'
      ELSE 'high'
    END,
    jsonb_build_object(
      'client_id', p_client_id,
      'access_type', p_access_type,
      'justification', p_justification,
      'timestamp', now(),
      'ip_address', current_setting('request.headers', true)::json->>'x-forwarded-for'
    )
  );
END;
$$;

-- Create stricter client access policy that logs all non-owner access
DROP POLICY "clients_total_lockdown" ON public.clients;

CREATE POLICY "clients_maximum_security" ON public.clients
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND (
    -- Owner access (always allowed)
    auth.uid() = user_id OR
    -- Role-based access with mandatory logging
    (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'manager', 'supervisor')
      ) AND
      -- Trigger logging for non-owner access
      (SELECT public.log_client_data_access(clients.id, 'role_based_access', 'supervisor_review')) IS NULL
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- Add trigger to automatically log sensitive data access
CREATE OR REPLACE FUNCTION public.audit_client_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only log SELECT operations on sensitive fields
  IF TG_OP = 'SELECT' AND auth.uid() != COALESCE(NEW.user_id, OLD.user_id) THEN
    PERFORM public.log_client_data_access(
      COALESCE(NEW.id, OLD.id),
      'sensitive_field_access',
      'automated_audit'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply the audit trigger to clients table
DROP TRIGGER IF EXISTS audit_client_sensitive_access ON public.clients;
CREATE TRIGGER audit_client_sensitive_access
  AFTER SELECT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_client_access();

-- Create function to validate business justification for admin access
CREATE OR REPLACE FUNCTION public.validate_admin_client_access(
  p_client_id uuid,
  p_justification text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Require detailed justification for admin access
  IF user_role = 'admin' AND (p_justification IS NULL OR length(p_justification) < 20) THEN
    -- Log insufficient justification
    PERFORM public.log_security_event(
      'insufficient_admin_justification',
      'high',
      jsonb_build_object(
        'client_id', p_client_id,
        'provided_justification', p_justification,
        'required_length', 20
      )
    );
    RETURN false;
  END IF;
  
  -- Log admin access with justification
  PERFORM public.log_security_event(
    'admin_client_access_justified',
    'critical',
    jsonb_build_object(
      'client_id', p_client_id,
      'justification', p_justification,
      'admin_user', auth.uid()
    )
  );
  
  RETURN true;
END;
$$;

-- Enhance quotes table security with financial data protection
DROP POLICY "quotes_pricing_security" ON public.quotes;

CREATE POLICY "quotes_strict_financial_control" ON public.quotes
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'manager', 'supervisor')
      ) AND
      -- Log financial data access
      (SELECT public.log_security_event(
        'financial_data_accessed',
        'high',
        jsonb_build_object(
          'quote_id', quotes.id,
          'net_price', quotes.net_price,
          'total_price', quotes.total_price,
          'accessor_role', (SELECT role FROM public.user_roles WHERE user_id = auth.uid())
        )
      )) IS NULL
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'manager', 'supervisor')
    )
  )
);

-- Log this security enhancement
SELECT public.log_security_event(
  'enhanced_security_implemented',
  'low',
  jsonb_build_object(
    'enhancement', 'comprehensive_rls_audit_logging',
    'tables_secured', ARRAY['clients', 'quotes'],
    'features_added', ARRAY['audit_logging', 'access_validation', 'justification_requirements']
  )
);