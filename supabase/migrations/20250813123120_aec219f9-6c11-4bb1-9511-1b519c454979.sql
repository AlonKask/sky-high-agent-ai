-- Phase 3: Final security hardening - fix variable naming conflict

-- Add blanket DENY policies for anonymous users on all sensitive tables
DO $$
DECLARE
  tbl_name text;
  sensitive_tables text[] := ARRAY['clients', 'gmail_credentials', 'email_exchanges', 'user_sessions', 'quotes'];
BEGIN
  FOREACH tbl_name IN ARRAY sensitive_tables
  LOOP
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
      -- Ensure RLS is enabled
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
      
      -- Drop any insecure anonymous policies
      EXECUTE format('DROP POLICY IF EXISTS "Anonymous can view %s" ON public.%I', tbl_name, tbl_name);
      EXECUTE format('DROP POLICY IF EXISTS "Public can access %s" ON public.%I', tbl_name, tbl_name);
      
      -- Add/update DENY ALL policy for anonymous users
      EXECUTE format('DROP POLICY IF EXISTS "DENY all anonymous access to %s" ON public.%I', tbl_name, tbl_name);
      EXECUTE format('CREATE POLICY "DENY all anonymous access to %s" ON public.%I FOR ALL TO anon USING (false) WITH CHECK (false)', tbl_name, tbl_name);
      
    END IF;
  END LOOP;
END $$;

-- Log security hardening completion
INSERT INTO public.security_events (user_id, event_type, severity, details)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'security_hardening_completed',
  'low',
  jsonb_build_object(
    'phase', 'comprehensive_security_fixes',
    'timestamp', now(),
    'tables_secured', ARRAY['clients', 'gmail_credentials', 'email_exchanges', 'user_sessions', 'quotes'],
    'functions_implemented', ARRAY['validate_session_access', 'can_access_financial_data', 'can_access_client_data_enhanced', 'can_access_gmail_credentials_enhanced'],
    'cors_tightened', true,
    'input_validation_enhanced', true
  )
);