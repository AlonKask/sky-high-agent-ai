-- Enable realtime for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
SELECT pg_create_logical_replication_slot('supabase_realtime', 'pgoutput');

-- Enable realtime for notifications
INSERT INTO supabase_realtime.subscription (subscription_id, entity)
VALUES (gen_random_uuid(), 'public.notifications')
ON CONFLICT DO NOTHING;