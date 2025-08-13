-- 1) Secure clients_public view: remove PII columns and restrict privileges
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'clients_public'
  ) THEN
    DROP VIEW public.clients_public CASCADE;
  END IF;
END $$;

CREATE VIEW public.clients_public
WITH (
  security_barrier = true,
  security_invoker = true
) AS
SELECT 
  c.id,
  c.user_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.company,
  c.preferred_class,
  -- Exclude date_of_birth and any encrypted/sensitive fields
  c.notes,
  c.total_bookings,
  c.total_spent,
  c.last_trip_date,
  c.created_at,
  c.updated_at,
  c.data_classification,
  c.client_type
FROM public.clients AS c;

-- Lock down privileges: remove public/anon; allow only authenticated and service_role
REVOKE ALL ON public.clients_public FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.clients_public FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT ON public.clients_public TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT ON public.clients_public TO service_role;
  END IF;
END $$;

-- 2) Tighten clients RLS: remove broad write permissions for elevated roles
-- Drop previous ALL policy for elevated roles if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'Supervisors can view team data'
  ) THEN
    DROP POLICY "Supervisors can view team data" ON public.clients;
  END IF;
END $$;

-- Create SELECT-only policy for elevated roles
CREATE POLICY "Elevated roles can view clients"
ON public.clients
FOR SELECT
USING (
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Keep existing owner policies (INSERT/UPDATE/DELETE/SELECT) untouched
-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;