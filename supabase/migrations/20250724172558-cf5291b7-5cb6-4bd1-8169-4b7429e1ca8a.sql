-- Fix existing records with "Client" as last name
UPDATE public.clients 
SET 
  first_name = CASE 
    WHEN position('.' IN split_part(email, '@', 1)) > 0 THEN
      -- If there's a dot, try to capitalize the first part
      initcap(split_part(split_part(email, '@', 1), '.', 1))
    ELSE
      -- Otherwise, use the full username part
      initcap(split_part(email, '@', 1))
  END,
  last_name = CASE 
    WHEN position('.' IN split_part(email, '@', 1)) > 0 AND 
         length(split_part(split_part(email, '@', 1), '.', 2)) > 0 THEN
      -- If there's a meaningful second part after dot, use it
      initcap(split_part(split_part(email, '@', 1), '.', 2))
    ELSE
      -- Otherwise, leave empty
      ''
  END,
  updated_at = now()
WHERE last_name = 'Client';