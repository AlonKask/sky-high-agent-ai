-- Create assets table for centralized asset management
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  asset_category TEXT NOT NULL DEFAULT 'general',
  tags JSONB DEFAULT '[]'::jsonb,
  alt_text TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view public assets or their own assets" 
ON public.assets 
FOR SELECT 
USING (is_public = true OR auth.uid() = user_id OR has_admin_role());

CREATE POLICY "Users can create their own assets" 
ON public.assets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets" 
ON public.assets 
FOR UPDATE 
USING (auth.uid() = user_id OR has_admin_role())
WITH CHECK (auth.uid() = user_id OR has_admin_role());

CREATE POLICY "Users can delete their own assets" 
ON public.assets 
FOR DELETE 
USING (auth.uid() = user_id OR has_admin_role());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_assets_updated_at();

-- Create index for better performance
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_assets_category ON public.assets(asset_category);
CREATE INDEX idx_assets_public ON public.assets(is_public);
CREATE INDEX idx_assets_tags ON public.assets USING GIN(tags);