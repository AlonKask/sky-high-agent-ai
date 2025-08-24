-- Create gmail_credentials table for storing encrypted OAuth tokens
CREATE TABLE IF NOT EXISTS public.gmail_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  gmail_user_email TEXT,
  scope TEXT DEFAULT 'https://www.googleapis.com/auth/gmail.modify',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.gmail_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own Gmail credentials
CREATE POLICY "Users can manage their own Gmail credentials" 
ON public.gmail_credentials 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role can access all credentials (for OAuth callbacks)
CREATE POLICY "Service role can manage all Gmail credentials" 
ON public.gmail_credentials 
FOR ALL 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- Create RPC function to get Gmail integration status
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

-- Add validation trigger for encrypted tokens
CREATE OR REPLACE FUNCTION public.validate_gmail_credentials_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure only encrypted tokens are stored
  IF NEW.access_token_encrypted IS NULL AND NEW.refresh_token_encrypted IS NULL THEN
    RAISE EXCEPTION 'Gmail credentials must use encrypted token fields only' USING ERRCODE = '22000';
  END IF;
  
  -- Validate encrypted token format (should be base64)
  IF NEW.access_token_encrypted IS NOT NULL AND NOT public.is_base64(NEW.access_token_encrypted) THEN
    RAISE EXCEPTION 'Invalid encrypted access token format' USING ERRCODE = '22000';
  END IF;
  
  IF NEW.refresh_token_encrypted IS NOT NULL AND NOT public.is_base64(NEW.refresh_token_encrypted) THEN
    RAISE EXCEPTION 'Invalid encrypted refresh token format' USING ERRCODE = '22000';
  END IF;
  
  -- Log credential updates for security monitoring
  PERFORM public.log_security_event(
    'gmail_credentials_updated',
    'medium',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'gmail_email', NEW.gmail_user_email,
      'has_encrypted_tokens', (NEW.access_token_encrypted IS NOT NULL),
      'validation_passed', true
    )
  );
  
  RETURN NEW;
END;
$$;

-- Apply validation trigger
CREATE TRIGGER validate_gmail_credentials_trigger
  BEFORE INSERT OR UPDATE ON public.gmail_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_gmail_credentials_security();

-- Add updated_at trigger
CREATE TRIGGER update_gmail_credentials_updated_at
  BEFORE UPDATE ON public.gmail_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_teams_updated_at();