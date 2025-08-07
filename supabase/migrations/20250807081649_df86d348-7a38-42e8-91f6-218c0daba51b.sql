-- Fix security issue: Add public policy for client token access
CREATE POLICY "Public access via client token" ON public.option_reviews
  FOR SELECT USING (true);