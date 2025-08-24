-- Update get_gmail_integration_status function to handle the new gmail_credentials table properly
CREATE OR REPLACE FUNCTION public.get_gmail_integration_status(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, gmail_user_email text, token_expires_at timestamp with time zone, is_connected boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id UUID;
BEGIN
  -- Use provided user_id or default to current user
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Security check: users can only view their own status unless they have elevated permissions
  IF target_user_id != auth.uid() AND NOT public.can_access_gmail_integration(target_user_id) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    gc.user_id,
    gc.gmail_user_email,
    gc.token_expires_at,
    CASE 
      WHEN gc.access_token_encrypted IS NOT NULL AND gc.token_expires_at > now() THEN true 
      ELSE false 
    END as is_connected,
    gc.created_at,
    gc.updated_at
  FROM public.gmail_credentials gc
  WHERE gc.user_id = target_user_id;
  
  -- If no record exists, return a row with false connection status
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      target_user_id as user_id,
      NULL::text as gmail_user_email,
      NULL::timestamp with time zone as token_expires_at,
      false as is_connected,
      NULL::timestamp with time zone as created_at,
      NULL::timestamp with time zone as updated_at;
  END IF;
END;
$function$;