-- Harden function search_path for SQL function
CREATE OR REPLACE FUNCTION public.is_base64(p_text TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT (
    CASE
      WHEN p_text IS NULL THEN TRUE
      ELSE (p_text ~ '^[A-Za-z0-9+/=\n\r]+$' AND length(p_text) % 4 = 0 AND length(p_text) >= 16)
    END
  );
$$;