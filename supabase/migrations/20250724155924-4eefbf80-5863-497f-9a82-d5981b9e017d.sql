-- Enable the pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule Gmail sync to run every 15 minutes
SELECT cron.schedule(
  'gmail-auto-sync',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/scheduled-gmail-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcndqZmR5cHF6ZXF1b3ZtdmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDA4MzEsImV4cCI6MjA2ODY3NjgzMX0.r2Y4sVUM_0ofU1G8QGDDqSR7-LatBkWXa8pWSwniXdE"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);