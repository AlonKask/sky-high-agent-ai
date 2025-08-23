-- Update user preferences to link the company logo
UPDATE user_preferences 
SET company_logo_asset_id = '3bbfd2cf-26d0-4e9e-aed0-c79319db591f'
WHERE company_logo_asset_id IS NULL;