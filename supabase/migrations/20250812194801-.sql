-- Secure clients_public view: enforce SECURITY INVOKER, add security barrier, and restrict privileges

-- 1) Recreate the view with SECURITY INVOKER and a clear column list
DROP VIEW IF EXISTS public.clients_public CASCADE;

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
  c.notes,
  c.total_bookings,
  c.total_spent,
  c.last_trip_date,
  c.created_at,
  c.updated_at,
  c.date_of_birth,
  c.data_classification,
  c.client_type
FROM public.clients AS c;

-- 2) Lock down privileges: no public/anon access; allow only authenticated and service_role
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

-- 3) Optional: ensure schema usage is available to authenticated (common in Supabase)
GRANT USAGE ON SCHEMA public TO authenticated;
