-- Fix the ambiguous user_id reference in get_gmail_integration_status function
CREATE OR REPLACE FUNCTION public.get_gmail_integration_status(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  gmail_user_email text,
  token_expires_at timestamp with time zone,
  is_connected boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if requesting user can access this data
  IF auth.uid() != p_user_id AND NOT public.has_admin_role() THEN
    RAISE EXCEPTION 'Access denied: Cannot access other users Gmail credentials';
  END IF;

  -- Check if credentials exist for this user
  IF EXISTS (SELECT 1 FROM public.gmail_credentials WHERE gmail_credentials.user_id = p_user_id) THEN
    -- Return credentials info with explicit table qualification
    RETURN QUERY
    SELECT 
      gc.user_id,
      gc.gmail_user_email,
      gc.token_expires_at,
      CASE 
        WHEN gc.access_token_encrypted IS NOT NULL 
             AND gc.refresh_token_encrypted IS NOT NULL 
             AND (gc.token_expires_at IS NULL OR gc.token_expires_at > now()) 
        THEN true 
        ELSE false 
      END as is_connected,
      gc.created_at,
      gc.updated_at
    FROM public.gmail_credentials gc
    WHERE gc.user_id = p_user_id;
  ELSE
    -- Return default row indicating no credentials exist
    RETURN QUERY
    SELECT 
      p_user_id as user_id,
      NULL::TEXT as gmail_user_email,
      NULL::TIMESTAMP WITH TIME ZONE as token_expires_at,
      false as is_connected,
      NULL::TIMESTAMP WITH TIME ZONE as created_at,
      NULL::TIMESTAMP WITH TIME ZONE as updated_at;
  END IF;
END;
$$;