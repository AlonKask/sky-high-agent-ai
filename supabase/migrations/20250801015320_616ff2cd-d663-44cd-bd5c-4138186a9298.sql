-- Fix user_roles table for proper role assignment
-- Add unique constraint on user_id to enable proper upsert behavior
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Add RLS policies to allow admins, managers, and supervisors to manage user roles
CREATE POLICY "Admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'supervisor')
);

CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'supervisor')
);

CREATE POLICY "Admins can view user roles" 
ON public.user_roles 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'supervisor')
);