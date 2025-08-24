-- Drop existing function to recreate with proper parameters
DROP FUNCTION IF EXISTS public.get_gmail_integration_status(uuid);

-- Create updated RPC function to get Gmail integration status
CREATE OR REPLACE FUNCTION public.get_gmail_integration_status(p_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  gmail_user_email TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_connected BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
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
  WHERE gc.user_id = p_user_id
  
  UNION ALL
  
  -- Return empty row with user_id if no credentials exist
  SELECT 
    p_user_id as user_id,
    NULL::TEXT as gmail_user_email,
    NULL::TIMESTAMP WITH TIME ZONE as token_expires_at,
    false as is_connected,
    NULL::TIMESTAMP WITH TIME ZONE as created_at,
    NULL::TIMESTAMP WITH TIME ZONE as updated_at
  WHERE NOT EXISTS (
    SELECT 1 FROM public.gmail_credentials WHERE user_id = p_user_id
  );
END;
$$;