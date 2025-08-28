-- Phase 2: Clear existing plain-text emails without HTML content
DELETE FROM public.email_exchanges 
WHERE user_id IS NOT NULL 
  AND html_body IS NULL 
  AND body IS NOT NULL;