-- Update existing user roles before changing the enum
-- Merge dev -> admin
UPDATE public.user_roles 
SET role = 'admin' 
WHERE role = 'dev';

-- Merge moderator -> manager  
UPDATE public.user_roles 
SET role = 'manager' 
WHERE role = 'moderator';

-- Merge sales_agent -> cs_agent (which we'll rename to agent)
UPDATE public.user_roles 
SET role = 'cs_agent' 
WHERE role = 'sales_agent';

-- Now rename cs_agent to agent for all users
UPDATE public.user_roles 
SET role = 'agent' 
WHERE role = 'cs_agent';

-- Drop the old enum and create new one with consolidated roles
DROP TYPE IF EXISTS public.app_role CASCADE;

CREATE TYPE public.app_role AS ENUM (
  'admin',
  'manager', 
  'supervisor',
  'gds_expert',
  'agent',
  'user'
);

-- Update the user_roles table to use the new enum
ALTER TABLE public.user_roles 
ALTER COLUMN role TYPE public.app_role 
USING role::text::public.app_role;

-- Recreate any functions that used the old enum
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