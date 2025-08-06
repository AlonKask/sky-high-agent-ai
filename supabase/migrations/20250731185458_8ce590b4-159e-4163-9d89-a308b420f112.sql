-- Fix email_exchanges status constraint to allow all valid statuses
ALTER TABLE public.email_exchanges DROP CONSTRAINT IF EXISTS email_exchanges_status_check;

-- Add updated status constraint that allows all the statuses being used
ALTER TABLE public.email_exchanges ADD CONSTRAINT email_exchanges_status_check 
CHECK (status IN ('sent', 'received', 'draft', 'failed', 'pending', 'delivered', 'read', 'unread', 'archived'));

-- Fix unique constraint on email_sync_status to handle updates properly
-- First check if the constraint exists and then handle duplicates
DO $$ 
BEGIN
    -- Handle duplicate records first
    DELETE FROM public.email_sync_status 
    WHERE id NOT IN (
        SELECT MIN(id) 
        FROM public.email_sync_status 
        GROUP BY user_id, folder_name
    );
EXCEPTION WHEN OTHERS THEN
    -- Continue if no duplicates exist
    NULL;
END $$;

-- Update the sync function to use UPSERT properly
CREATE OR REPLACE FUNCTION public.handle_email_sync_status(
    p_user_id uuid,
    p_folder_name text,
    p_last_sync_at timestamp with time zone,
    p_last_sync_count integer
) RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;