-- PHASE 1: Critical RLS Policy Consolidation & Security Hardening (Fixed)
-- This migration consolidates overlapping RLS policies and implements comprehensive security measures

-- First, drop all existing overlapping RLS policies on sensitive tables
DROP POLICY IF EXISTS "clients_total_lockdown" ON public.clients;
DROP POLICY IF EXISTS "clients_ultra_secure_with_audit" ON public.clients;
DROP POLICY IF EXISTS "quotes_financial_fortress" ON public.quotes;
DROP POLICY IF EXISTS "quotes_pricing_security" ON public.quotes;

-- Create consolidated, single-purpose RLS policies for each table
-- CLIENTS TABLE: Ultra-secure with comprehensive audit logging
CREATE POLICY "clients_consolidated_security"
ON public.clients
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Users can access their own data
    auth.uid() = user_id 
    OR 
    -- Role-based access with mandatory audit logging
    (
      EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'manager', 'supervisor')
      )
      AND (
        SELECT public.log_security_event(
          'privileged_client_access',
          'critical',
          jsonb_build_object(
            'client_id', clients.id,
            'client_owner', clients.user_id,
            'accessor_user', auth.uid(),
            'accessor_role', (SELECT role FROM public.user_roles WHERE user_id = auth.uid()),
            'data_classification', clients.data_classification,
            'access_type', 'role_based_override',
            'requires_justification', true
          )
        )
      ) IS NULL
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- QUOTES TABLE: Financial data protection with audit trail
CREATE POLICY "quotes_financial_security"
ON public.quotes
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Users can access their own quotes
    auth.uid() = user_id 
    OR 
    -- Role-based access with financial audit logging
    (
      EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'manager', 'supervisor')
      )
      AND (
        SELECT public.log_security_event(
          'financial_data_accessed',
          'critical',
          jsonb_build_object(
            'quote_id', quotes.id,
            'client_id', quotes.client_id,
            'net_price', quotes.net_price,
            'total_price', quotes.total_price,
            'markup', quotes.markup,
            'accessor_role', (SELECT role FROM public.user_roles WHERE user_id = auth.uid()),
            'financial_sensitivity', quotes.financial_sensitivity,
            'access_justification_required', true
          )
        )
      ) IS NULL
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Enhanced audit trigger for comprehensive security monitoring
CREATE OR REPLACE FUNCTION public.enhanced_security_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all operations on sensitive tables with enhanced details
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'sensitive_data_operation',
    CASE 
      WHEN auth.uid() IS NULL THEN 'critical'
      WHEN TG_OP IN ('UPDATE', 'DELETE') THEN 'high'
      ELSE 'medium'
    END,
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'authenticated', auth.uid() IS NOT NULL,
      'user_role', (SELECT role FROM public.user_roles WHERE user_id = auth.uid()),
      'timestamp', now(),
      'data_classification', 
        CASE TG_TABLE_NAME
          WHEN 'clients' THEN 'confidential'
          WHEN 'quotes' THEN 'financial'
          WHEN 'email_exchanges' THEN 'private'
          WHEN 'bookings' THEN 'travel_sensitive'
          ELSE 'general'
        END,
      'operation_metadata', jsonb_build_object(
        'affected_columns', 
          CASE TG_OP
            WHEN 'UPDATE' THEN (
              SELECT array_agg(key) 
              FROM jsonb_each(to_jsonb(NEW)) 
              WHERE value IS DISTINCT FROM (to_jsonb(OLD) -> key)
            )
            ELSE NULL
          END
      )
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER enhanced_clients_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_security_audit();

CREATE TRIGGER enhanced_quotes_audit  
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_security_audit();