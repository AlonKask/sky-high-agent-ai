-- Fix security warnings identified by Supabase linter

-- 1. Fix function search path issues for security
CREATE OR REPLACE FUNCTION public.update_airline_logo(p_airline_id uuid, p_logo_url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.airline_codes
  SET logo_url = p_logo_url,
      updated_at = now()
  WHERE id = p_airline_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_airline_with_logo(p_iata_code text)
 RETURNS TABLE(id uuid, iata_code text, name text, logo_url text, country text, alliance text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.iata_code,
    a.name,
    a.logo_url,
    a.country,
    a.alliance
  FROM public.airline_codes a
  WHERE a.iata_code = p_iata_code;
END;
$function$;

-- 2. Create extensions schema and move pg_net extension
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3. Add RLS policies for sensitive tables that actually exist

-- RLS policies for data_retention_policies table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'data_retention_policies') THEN
    -- Enable RLS
    ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
    
    -- Only admins can manage data retention policies
    CREATE POLICY "Only admins can manage data retention policies" ON public.data_retention_policies
      FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;

-- RLS policies for encryption_keys table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'encryption_keys') THEN
    -- Enable RLS
    ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;
    
    -- Only admins can access encryption keys - extremely restricted
    CREATE POLICY "Only admins can manage encryption keys" ON public.encryption_keys
      FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;