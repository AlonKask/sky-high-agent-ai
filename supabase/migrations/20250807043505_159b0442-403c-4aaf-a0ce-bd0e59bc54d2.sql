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

-- 3. Configure OTP expiry to 10 minutes (600 seconds)
-- This will be handled via Supabase dashboard auth settings

-- 4. Add missing RLS policies for sensitive tables

-- RLS policies for data_retention_policies table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'data_retention_policies') THEN
    -- Enable RLS
    ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
    
    -- Only admins can manage data retention policies
    CREATE POLICY "Only admins can view data retention policies" ON public.data_retention_policies
      FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
      
    CREATE POLICY "Only admins can insert data retention policies" ON public.data_retention_policies
      FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
      
    CREATE POLICY "Only admins can update data retention policies" ON public.data_retention_policies
      FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
      
    CREATE POLICY "Only admins can delete data retention policies" ON public.data_retention_policies
      FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;

-- RLS policies for encryption_keys table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'encryption_keys') THEN
    -- Enable RLS
    ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;
    
    -- Only system/admins can access encryption keys - extremely restricted
    CREATE POLICY "Only admins can view encryption keys" ON public.encryption_keys
      FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
      
    CREATE POLICY "Only admins can insert encryption keys" ON public.encryption_keys
      FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
      
    CREATE POLICY "Only admins can update encryption keys" ON public.encryption_keys
      FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
      
    CREATE POLICY "Only admins can delete encryption keys" ON public.encryption_keys
      FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;

-- RLS policies for team_performance table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_performance') THEN
    -- Enable RLS
    ALTER TABLE public.team_performance ENABLE ROW LEVEL SECURITY;
    
    -- Team members can view their own team performance
    CREATE POLICY "Team members can view their team performance" ON public.team_performance
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.team_members tm 
          WHERE tm.team_id = team_performance.team_id 
          AND tm.user_id = auth.uid()
        ) OR
        has_role(auth.uid(), 'admin'::app_role) OR
        has_role(auth.uid(), 'manager'::app_role) OR
        has_role(auth.uid(), 'supervisor'::app_role)
      );
      
    -- Only managers and above can insert team performance
    CREATE POLICY "Managers can insert team performance" ON public.team_performance
      FOR INSERT WITH CHECK (
        has_role(auth.uid(), 'admin'::app_role) OR
        has_role(auth.uid(), 'manager'::app_role) OR
        has_role(auth.uid(), 'supervisor'::app_role)
      );
      
    -- Only managers and above can update team performance
    CREATE POLICY "Managers can update team performance" ON public.team_performance
      FOR UPDATE USING (
        has_role(auth.uid(), 'admin'::app_role) OR
        has_role(auth.uid(), 'manager'::app_role) OR
        has_role(auth.uid(), 'supervisor'::app_role)
      );
      
    -- Only admins can delete team performance
    CREATE POLICY "Only admins can delete team performance" ON public.team_performance
      FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;