-- Fix the function search path security warning by dropping trigger first
DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets;
DROP FUNCTION IF EXISTS public.update_assets_updated_at();

CREATE OR REPLACE FUNCTION public.update_assets_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_assets_updated_at();