-- Create new enum with consolidated roles (including agent)
CREATE TYPE public.app_role_new AS ENUM (
  'admin',
  'manager', 
  'supervisor',
  'gds_expert',
  'agent',
  'user'
);

-- Update user_roles table to use new enum temporarily
ALTER TABLE public.user_roles 
ADD COLUMN role_new public.app_role_new;

-- Update roles with proper mapping
UPDATE public.user_roles 
SET role_new = CASE 
  WHEN role = 'dev' THEN 'admin'::public.app_role_new
  WHEN role = 'moderator' THEN 'manager'::public.app_role_new
  WHEN role = 'sales_agent' THEN 'agent'::public.app_role_new
  WHEN role = 'cs_agent' THEN 'agent'::public.app_role_new
  WHEN role = 'admin' THEN 'admin'::public.app_role_new
  WHEN role = 'manager' THEN 'manager'::public.app_role_new
  WHEN role = 'supervisor' THEN 'supervisor'::public.app_role_new
  WHEN role = 'gds_expert' THEN 'gds_expert'::public.app_role_new
  WHEN role = 'user' THEN 'user'::public.app_role_new
  ELSE 'user'::public.app_role_new
END;

-- Drop the old column and enum
ALTER TABLE public.user_roles DROP COLUMN role;
DROP TYPE public.app_role CASCADE;

-- Rename new enum and column
ALTER TYPE public.app_role_new RENAME TO app_role;
ALTER TABLE public.user_roles RENAME COLUMN role_new TO role;

-- Recreate functions with new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$function$;