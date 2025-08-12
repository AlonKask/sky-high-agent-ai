-- Secure option_reviews access
ALTER TABLE public.option_reviews ENABLE ROW LEVEL SECURITY;

-- Drop permissive public SELECT policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'option_reviews' 
      AND policyname = 'Public access via client token'
  ) THEN
    EXECUTE 'DROP POLICY "Public access via client token" ON public.option_reviews';
  END IF;
END$$;

-- Ensure owner SELECT remains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'option_reviews' 
      AND policyname = 'Users can view their own option reviews'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own option reviews" 
      ON public.option_reviews FOR SELECT USING (auth.uid() = user_id)';
  END IF;
END$$;

-- Add elevated role visibility for oversight
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'option_reviews' 
      AND policyname = 'Supervisors can view option reviews'
  ) THEN
    EXECUTE 'CREATE POLICY "Supervisors can view option reviews" 
      ON public.option_reviews FOR SELECT 
      USING (has_role(auth.uid(), ''supervisor''::app_role) OR has_role(auth.uid(), ''manager''::app_role) OR has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END$$;

-- Create RPC to safely expose reviews via client token without table-wide SELECT
CREATE OR REPLACE FUNCTION public.get_option_reviews_by_token(p_client_token text)
RETURNS SETOF public.option_reviews
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  -- Basic token format validation: 64 hex chars (matches gen_random_bytes(32) -> hex)
  SELECT *
  FROM public.option_reviews r
  WHERE p_client_token ~ '^[0-9a-f]{64}$'
    AND r.client_token = p_client_token;
$$;

-- Grant execute to anon so public Option Portal can fetch by token
GRANT EXECUTE ON FUNCTION public.get_option_reviews_by_token(text) TO anon, authenticated;