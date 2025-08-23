-- Enhance assets table to support comprehensive asset management
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS asset_source text DEFAULT 'upload',
ADD COLUMN IF NOT EXISTS external_url text,
ADD COLUMN IF NOT EXISTS thumbnail_path text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS original_filename text;

-- Add enhanced categories for existing asset types
ALTER TYPE asset_category_enum ADD VALUE IF NOT EXISTS 'airline_logo';
ALTER TYPE asset_category_enum ADD VALUE IF NOT EXISTS 'aircraft_icon';
ALTER TYPE asset_category_enum ADD VALUE IF NOT EXISTS 'static_file';
ALTER TYPE asset_category_enum ADD VALUE IF NOT EXISTS 'external_cdn';

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_assets_search ON public.assets USING gin(to_tsvector('english', file_name || ' ' || coalesce(alt_text, '') || ' ' || coalesce(tags::text, '')));
CREATE INDEX IF NOT EXISTS idx_assets_source_category ON public.assets (asset_source, asset_category);
CREATE INDEX IF NOT EXISTS idx_assets_external_url ON public.assets (external_url) WHERE external_url IS NOT NULL;

-- Create storage bucket for assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'CRM Assets',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for assets storage bucket
INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('assets', '.gitkeep', null) ON CONFLICT DO NOTHING;

-- Policy: Public read access for public assets
CREATE POLICY IF NOT EXISTS "Public assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Policy: Authenticated users can upload assets
CREATE POLICY IF NOT EXISTS "Users can upload their own assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assets' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own assets
CREATE POLICY IF NOT EXISTS "Users can update their own assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'assets' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own assets (and admins can delete any)
CREATE POLICY IF NOT EXISTS "Users can delete their own assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assets' 
  AND (
    auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  ) OR has_admin_role()
);

-- Create function to migrate existing asset URLs to assets table
CREATE OR REPLACE FUNCTION public.migrate_existing_assets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Migrate airline logos
  INSERT INTO public.assets (
    user_id,
    file_name,
    file_path,
    file_type,
    asset_category,
    asset_source,
    external_url,
    alt_text,
    tags,
    is_public,
    metadata
  )
  SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid as user_id, -- System user for migrated assets
    ac.name || ' Logo' as file_name,
    ac.logo_url as file_path,
    'image' as file_type,
    'airline_logo' as asset_category,
    'external_cdn' as asset_source,
    ac.logo_url as external_url,
    ac.name || ' airline logo' as alt_text,
    jsonb_build_array('airline', 'logo', ac.iata_code, ac.name) as tags,
    true as is_public,
    jsonb_build_object(
      'airline_id', ac.id,
      'iata_code', ac.iata_code,
      'icao_code', ac.icao_code,
      'airline_name', ac.name,
      'country', ac.country,
      'alliance', ac.alliance,
      'migration_source', 'airline_codes.logo_url'
    ) as metadata
  FROM public.airline_codes ac
  WHERE ac.logo_url IS NOT NULL 
    AND ac.logo_url != ''
    AND NOT EXISTS (
      SELECT 1 FROM public.assets a 
      WHERE a.external_url = ac.logo_url 
        AND a.asset_category = 'airline_logo'
    );

  -- Migrate aircraft icons
  INSERT INTO public.assets (
    user_id,
    file_name,
    file_path,
    file_type,
    asset_category,
    asset_source,
    external_url,
    alt_text,
    tags,
    is_public,
    metadata
  )
  SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid as user_id,
    am.display_label || ' Icon' as file_name,
    am.icon_url as file_path,
    'image' as file_type,
    'aircraft_icon' as asset_category,
    'external_cdn' as asset_source,
    am.icon_url as external_url,
    am.display_label || ' aircraft icon' as alt_text,
    jsonb_build_array('aircraft', 'icon', am.code, am.manufacturer, am.family) as tags,
    true as is_public,
    jsonb_build_object(
      'aircraft_id', am.id,
      'code', am.code,
      'manufacturer', am.manufacturer,
      'family', am.family,
      'model', am.model,
      'category', am.category,
      'migration_source', 'aircraft_models.icon_url'
    ) as metadata
  FROM public.aircraft_models am
  WHERE am.icon_url IS NOT NULL 
    AND am.icon_url != ''
    AND NOT EXISTS (
      SELECT 1 FROM public.assets a 
      WHERE a.external_url = am.icon_url 
        AND a.asset_category = 'aircraft_icon'
    );

  -- Add static assets (favicon, placeholder)
  INSERT INTO public.assets (
    user_id,
    file_name,
    file_path,
    file_type,
    asset_category,
    asset_source,
    external_url,
    alt_text,
    tags,
    is_public,
    metadata
  )
  VALUES 
    (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'Favicon',
      '/favicon.ico',
      'image',
      'static_file',
      'static',
      '/favicon.ico',
      'Application favicon',
      jsonb_build_array('favicon', 'icon', 'static'),
      true,
      jsonb_build_object('migration_source', 'static_file', 'type', 'favicon')
    ),
    (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'Placeholder Image',
      '/placeholder.svg',
      'image',
      'static_file',
      'static',
      '/placeholder.svg',
      'Placeholder image',
      jsonb_build_array('placeholder', 'svg', 'static'),
      true,
      jsonb_build_object('migration_source', 'static_file', 'type', 'placeholder')
    )
  ON CONFLICT DO NOTHING;
END;
$$;

-- Create function to get asset by external URL (for backward compatibility)
CREATE OR REPLACE FUNCTION public.get_asset_by_url(p_url text)
RETURNS TABLE(
  id uuid,
  file_name text,
  file_path text,
  asset_category text,
  tags jsonb,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.file_name,
    a.file_path,
    a.asset_category::text,
    a.tags,
    a.metadata
  FROM public.assets a
  WHERE a.external_url = p_url
    OR a.file_path = p_url
  ORDER BY 
    CASE a.asset_source
      WHEN 'upload' THEN 1
      WHEN 'static' THEN 2
      WHEN 'external_cdn' THEN 3
      ELSE 4
    END
  LIMIT 1;
END;
$$;