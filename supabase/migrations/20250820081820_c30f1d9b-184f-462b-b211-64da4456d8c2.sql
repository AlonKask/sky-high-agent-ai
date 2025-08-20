-- ENHANCED SECURITY FIX: Correct implementation without invalid SELECT trigger
-- Address remaining role-based access concerns with proper audit logging

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
      'timestamp', now()
    )
  );
END;
$$;

-- Create stricter client access policy with embedded logging
DROP POLICY IF EXISTS "clients_maximum_security" ON public.clients;

CREATE POLICY "clients_ultra_secure_with_audit" ON public.clients
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND (
    -- Owner access (always allowed)
    auth.uid() = user_id OR
    -- Role-based access with mandatory logging embedded in policy
    (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'manager', 'supervisor')
      ) AND
      -- Log non-owner access within the policy itself
      (
        SELECT public.log_security_event(
          'privileged_client_access',
          'high',
          jsonb_build_object(
            'client_id', clients.id,
            'client_owner', clients.user_id,
            'accessor_user', auth.uid(),
            'accessor_role', (SELECT role FROM public.user_roles WHERE user_id = auth.uid()),
            'access_type', 'role_based_privileged_access'
          )
        )
      ) IS NULL
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
);

-- Enhanced quotes table with financial access logging
DROP POLICY IF EXISTS "quotes_strict_financial_control" ON public.quotes;

CREATE POLICY "quotes_financial_fortress" ON public.quotes
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
      -- Mandatory financial data access logging
      (
        SELECT public.log_security_event(
          'financial_data_accessed',
          'high',
          jsonb_build_object(
            'quote_id', quotes.id,
            'client_id', quotes.client_id,
            'net_price_accessed', quotes.net_price,
            'total_price_accessed', quotes.total_price,
            'markup_accessed', quotes.markup,
            'accessor_role', (SELECT role FROM public.user_roles WHERE user_id = auth.uid()),
            'financial_sensitivity', quotes.financial_sensitivity
          )
        )
      ) IS NULL
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

-- Enhanced email exchanges policy with communication privacy
DROP POLICY IF EXISTS "emails_communication_security" ON public.email_exchanges;

CREATE POLICY "emails_privacy_fortress" ON public.email_exchanges
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
      -- Log privileged email access
      (
        SELECT public.log_security_event(
          'email_communication_accessed',
          'high',
          jsonb_build_object(
            'email_id', email_exchanges.id,
            'email_owner', email_exchanges.user_id,
            'subject_accessed', email_exchanges.subject,
            'accessor_role', (SELECT role FROM public.user_roles WHERE user_id = auth.uid()),
            'privacy_violation_risk', 'supervisor_access'
          )
        )
      ) IS NULL
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