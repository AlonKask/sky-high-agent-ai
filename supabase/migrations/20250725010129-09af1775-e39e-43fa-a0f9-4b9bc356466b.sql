-- Update email_exchanges to associate them with clients based on email addresses
UPDATE email_exchanges 
SET client_id = clients.id
FROM clients 
WHERE email_exchanges.client_id IS NULL 
AND email_exchanges.user_id = clients.user_id
AND (
  email_exchanges.sender_email ILIKE '%' || TRIM(BOTH '<>" ' FROM clients.email) || '%'
  OR 
  EXISTS (
    SELECT 1 
    FROM unnest(email_exchanges.recipient_emails) AS recipient_email
    WHERE recipient_email ILIKE '%' || TRIM(BOTH '<>" ' FROM clients.email) || '%'
  )
);