-- Create assets storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for assets bucket
-- Users can upload their own assets
CREATE POLICY "Users can upload their own assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own assets and public assets
CREATE POLICY "Users can view their own assets and public assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assets' AND 
    (auth.uid()::text = (storage.foldername(name))[1] OR 
     EXISTS (SELECT 1 FROM public.assets 
             WHERE file_path = name 
             AND is_public = true))
  );

-- Users can update their own assets
CREATE POLICY "Users can update their own assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own assets
CREATE POLICY "Users can delete their own assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);