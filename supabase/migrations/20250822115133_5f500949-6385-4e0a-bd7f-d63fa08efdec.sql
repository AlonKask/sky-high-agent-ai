-- Add RLS policy to allow admins to view all profiles
-- This will enable the Users page to display all registered users for administrators
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_admin_role());