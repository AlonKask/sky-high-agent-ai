-- Add page_context column to assets table for filtering by usage context
ALTER TABLE public.assets 
ADD COLUMN page_context text DEFAULT 'general';

-- Create index for better performance on page_context filtering
CREATE INDEX idx_assets_page_context ON public.assets(page_context);

-- Update existing assets with appropriate page contexts based on their categories
UPDATE public.assets 
SET page_context = CASE 
  WHEN asset_category = 'airline_logo' THEN 'airline_data'
  WHEN asset_category = 'aircraft_icon' THEN 'airline_data'
  WHEN asset_category = 'logo' THEN 'company_branding'
  WHEN asset_category = 'company_logo' THEN 'company_branding'
  WHEN asset_category = 'avatar' THEN 'user_profiles'
  WHEN asset_category = 'attachment' THEN 'email_templates'
  WHEN asset_category = 'static_file' THEN 'general'
  ELSE 'general'
END;