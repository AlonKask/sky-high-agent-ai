-- Fix security warning: Replace function with secure search_path
DROP FUNCTION update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the triggers that were dropped
CREATE TRIGGER update_email_drafts_updated_at
  BEFORE UPDATE ON email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates  
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();