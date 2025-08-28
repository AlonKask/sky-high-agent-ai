-- Aggressive cleanup: Keep only the earliest email for each (user_id, message_id) pair
WITH ranked_emails AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, message_id ORDER BY created_at ASC) as rn
  FROM email_exchanges
)
DELETE FROM email_exchanges 
WHERE id IN (
  SELECT id FROM ranked_emails WHERE rn > 1
);