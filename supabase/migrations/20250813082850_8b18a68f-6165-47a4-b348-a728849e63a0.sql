-- Fix remaining security definer view issue

-- Remove the view entirely and create a proper function instead
DROP VIEW IF EXISTS public.gmail_integration_status;

-- Create a secure function to get Gmail integration status
CREATE OR REPLACE FUNCTION public.get_gmail_integration_status(p_user_id UUID DEFAULT NULL)
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
      WHEN gc.access_token_encrypted IS NOT NULL THEN true 
      ELSE false 
    END as is_connected,
    gc.created_at,
    gc.updated_at
  FROM public.gmail_credentials gc
  WHERE gc.user_id = target_user_id;
END;
$$;