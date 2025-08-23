-- Add company logo asset reference to user preferences
ALTER TABLE public.user_preferences 
ADD COLUMN company_logo_asset_id UUID REFERENCES public.assets(id);

-- Add company_logo category to existing assets where appropriate
UPDATE public.assets 
SET asset_category = 'company_logo' 
WHERE asset_category = 'general' 
AND (LOWER(file_name) LIKE '%logo%' OR LOWER(alt_text) LIKE '%logo%' OR LOWER(alt_text) LIKE '%company%');