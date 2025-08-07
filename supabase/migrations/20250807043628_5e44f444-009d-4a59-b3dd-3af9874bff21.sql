-- Fix remaining function search path issues
CREATE OR REPLACE FUNCTION public.update_airline_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_email_sync_status(p_user_id uuid, p_folder_name text, p_last_sync_at timestamp with time zone, p_last_sync_count integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.email_sync_status (
        user_id, 
        folder_name, 
        last_sync_at, 
        last_sync_count, 
        updated_at
    ) VALUES (
        p_user_id, 
        p_folder_name, 
        p_last_sync_at, 
        p_last_sync_count, 
        now()
    )
    ON CONFLICT (user_id, folder_name) 
    DO UPDATE SET 
        last_sync_at = EXCLUDED.last_sync_at,
        last_sync_count = EXCLUDED.last_sync_count,
        updated_at = now();
END;
$function$;

-- Add RLS policy for data_retention_policies if the table doesn't exist with policies
DO $$
BEGIN
  -- Check if table exists but has no policies
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'data_retention_policies'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'data_retention_policies'
  ) THEN
    -- Enable RLS and create policy
    ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Only admins can manage data retention policies" ON public.data_retention_policies
      FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;