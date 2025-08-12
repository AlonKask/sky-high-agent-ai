-- 1) Create an upsert trigger to prevent duplicate key errors on email_sync_status
CREATE OR REPLACE FUNCTION public.email_sync_status_upsert_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If a row with same (user_id, folder_name) exists, update it and skip the insert
  UPDATE public.email_sync_status AS ess
  SET 
    last_sync_at = COALESCE(NEW.last_sync_at, ess.last_sync_at),
    last_sync_count = COALESCE(NEW.last_sync_count, ess.last_sync_count),
    gmail_history_id = COALESCE(NEW.gmail_history_id, ess.gmail_history_id),
    updated_at = now()
  WHERE ess.user_id = NEW.user_id
    AND ess.folder_name = NEW.folder_name;

  IF FOUND THEN
    -- Skip inserting a duplicate; UPDATE already applied
    RETURN NULL;
  END IF;

  -- Ensure updated_at is set for fresh inserts
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists (idempotent)
DROP TRIGGER IF EXISTS trg_email_sync_status_upsert ON public.email_sync_status;

-- Create BEFORE INSERT trigger to apply the upsert behavior
CREATE TRIGGER trg_email_sync_status_upsert
BEFORE INSERT ON public.email_sync_status
FOR EACH ROW
EXECUTE FUNCTION public.email_sync_status_upsert_trigger();
