-- Update existing SBC Logo asset to use company_logo category for better organization
UPDATE public.assets 
SET asset_category = 'company_logo', 
    is_public = true,
    updated_at = now()
WHERE file_name ILIKE '%SBC Logo%' 
   OR original_filename ILIKE '%SBC Logo%'
   OR alt_text ILIKE '%SBC%';