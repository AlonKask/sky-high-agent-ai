-- Update gmail credentials table to ensure sync tracking works properly
-- Add trigger to update last_sync_at when sync operations complete

-- Function to update last_sync_at when Gmail sync completes
CREATE OR REPLACE FUNCTION public.update_gmail_last_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update last_sync_at when credentials are updated
  IF OLD.updated_at IS DISTINCT FROM NEW.updated_at THEN
    NEW.last_sync_at := now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on gmail_credentials table
DROP TRIGGER IF EXISTS trigger_update_gmail_last_sync ON public.gmail_credentials;
CREATE TRIGGER trigger_update_gmail_last_sync
  BEFORE UPDATE ON public.gmail_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gmail_last_sync();