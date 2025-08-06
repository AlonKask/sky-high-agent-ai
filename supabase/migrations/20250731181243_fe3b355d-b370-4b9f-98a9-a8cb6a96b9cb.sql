-- Add 'dev' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE 'dev';

-- Update matthew@selectbusinessclass.com role to 'dev'
UPDATE public.user_roles 
SET role = 'dev'
WHERE user_id = (
  SELECT auth.users.id 
  FROM auth.users 
  WHERE auth.users.email = 'matthew@selectbusinessclass.com'
);

-- If the user doesn't have a role record, insert one
INSERT INTO public.user_roles (user_id, role)
SELECT auth.users.id, 'dev'
FROM auth.users 
WHERE auth.users.email = 'matthew@selectbusinessclass.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.users.id
);