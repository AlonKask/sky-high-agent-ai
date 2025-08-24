-- Create handle_email_sync_status function for upsert operations
CREATE OR REPLACE FUNCTION public.handle_email_sync_status(
  p_user_id uuid,
  p_folder_name text,
  p_last_sync_at timestamp with time zone,
  p_last_sync_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Upsert email sync status
  INSERT INTO public.email_sync_status (
    user_id, 
    folder_name, 
    last_sync_at, 
    last_sync_count, 
    updated_at
  )
  VALUES (
    p_user_id, 
    p_folder_name, 
    p_last_sync_at, 
    p_last_sync_count, 
    now()
  )
  ON CONFLICT (user_id, folder_name) 
  DO UPDATE SET 
    last_sync_at = p_last_sync_at,
    last_sync_count = p_last_sync_count,
    updated_at = now();
END;
$function$;