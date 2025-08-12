
-- 1) Create a safe, read-only view that exposes only non-sensitive client columns
CREATE OR REPLACE VIEW public.clients_public
WITH (security_barrier) AS
SELECT
  id,
  user_id,
  total_bookings,
  total_spent,
  last_trip_date,
  created_at,
  updated_at,
  date_of_birth,
  first_name,
  last_name,
  email,
  phone,
  company,
  preferred_class,
  notes,
  data_classification,
  client_type
FROM public.clients;

-- 2) Lock down access
REVOKE ALL ON TABLE public.clients_public FROM PUBLIC;
GRANT SELECT ON TABLE public.clients_public TO authenticated;

-- Note:
-- - RLS policies on public.clients still apply to row visibility through this view.
-- - This view prevents column-level permission errors caused by SELECT * on the base table.
