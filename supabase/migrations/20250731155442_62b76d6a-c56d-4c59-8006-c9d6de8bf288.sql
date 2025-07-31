-- First, add new enum values one by one
ALTER TYPE public.app_role ADD VALUE 'dev';
ALTER TYPE public.app_role ADD VALUE 'manager';
ALTER TYPE public.app_role ADD VALUE 'supervisor';
ALTER TYPE public.app_role ADD VALUE 'gds_expert';
ALTER TYPE public.app_role ADD VALUE 'cs_agent';
ALTER TYPE public.app_role ADD VALUE 'sales_agent';