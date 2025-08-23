-- Create storage policies for avatar uploads
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (name LIKE '%avatar%' OR name LIKE '%profile%')
);

CREATE POLICY "Users can update their own avatars" ON storage.objects  
FOR UPDATE USING (
  bucket_id = 'assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (name LIKE '%avatar%' OR name LIKE '%profile%')
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (name LIKE '%avatar%' OR name LIKE '%profile%')
);