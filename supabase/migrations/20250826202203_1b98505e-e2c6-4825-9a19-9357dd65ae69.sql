-- Phase 1: Create missing log_security_event function to fix sync failures
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert security event with current user context
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details,
    timestamp
  ) VALUES (
    auth.uid(),
    p_event_type,
    p_severity,
    p_details,
    now()
  );
EXCEPTION WHEN OTHERS THEN
  -- If security_events table doesn't exist or other issues, just continue
  -- This prevents sync operations from failing due to logging issues
  NULL;
END;
$$;

-- Phase 2: Create email sync configuration table
CREATE TABLE IF NOT EXISTS public.email_sync_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  max_emails_per_sync integer NOT NULL DEFAULT 200,
  sync_frequency_minutes integer NOT NULL DEFAULT 15,
  enable_full_mailbox_sync boolean NOT NULL DEFAULT true,
  enable_historical_sync boolean NOT NULL DEFAULT true,
  sync_days_back integer NOT NULL DEFAULT 365, -- 1 year by default
  last_full_sync_at timestamp with time zone,
  sync_preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on sync config
ALTER TABLE public.email_sync_config ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own sync config
CREATE POLICY "Users can manage their own sync config"
ON public.email_sync_config
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Phase 3: Create sync progress tracking table
CREATE TABLE IF NOT EXISTS public.email_sync_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sync_type text NOT NULL, -- 'initial', 'incremental', 'historical'
  status text NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
  emails_processed integer DEFAULT 0,
  emails_stored integer DEFAULT 0,
  total_emails_estimated integer DEFAULT 0,
  current_batch integer DEFAULT 1,
  total_batches_estimated integer DEFAULT 1,
  error_message text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  sync_metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on sync progress
ALTER TABLE public.email_sync_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own sync progress
CREATE POLICY "Users can view their own sync progress"
ON public.email_sync_progress
FOR SELECT
USING (auth.uid() = user_id);

-- System can manage sync progress
CREATE POLICY "System can manage sync progress"
ON public.email_sync_progress
FOR ALL
USING (true)
WITH CHECK (true);

-- Phase 4: Add indexes for better performance with large email volumes
CREATE INDEX IF NOT EXISTS idx_email_exchanges_user_received_at 
ON public.email_exchanges(user_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_exchanges_message_id 
ON public.email_exchanges(message_id);

CREATE INDEX IF NOT EXISTS idx_email_exchanges_thread_id 
ON public.email_exchanges(thread_id);

CREATE INDEX IF NOT EXISTS idx_email_exchanges_folder_status 
ON public.email_exchanges(user_id, is_deleted, is_archived, folder_name);

-- Phase 5: Handle email sync status upserts better
CREATE OR REPLACE FUNCTION public.handle_email_sync_status(
  p_user_id uuid,
  p_folder_name text,
  p_last_sync_count integer DEFAULT 0,
  p_gmail_history_id text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.email_sync_status (
    user_id,
    folder_name,
    last_sync_at,
    last_sync_count,
    gmail_history_id,
    updated_at
  ) VALUES (
    p_user_id,
    p_folder_name,
    now(),
    p_last_sync_count,
    p_gmail_history_id,
    now()
  )
  ON CONFLICT (user_id, folder_name) 
  DO UPDATE SET
    last_sync_at = now(),
    last_sync_count = EXCLUDED.last_sync_count,
    gmail_history_id = COALESCE(EXCLUDED.gmail_history_id, email_sync_status.gmail_history_id),
    updated_at = now();
END;
$$;