-- Fix critical security vulnerability: Strengthen RLS policies for clients table
-- Drop existing function first to avoid parameter conflict
DROP FUNCTION IF EXISTS public.log_security_event(text, text, jsonb);

-- First, enhance the existing clients RLS policies to be more restrictive
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients; 
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "Strict user access to own clients only" ON public.clients;

-- Create more secure policies that check for proper authentication and user ownership
CREATE POLICY "Strict user access to own clients only" 
ON public.clients 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND validate_session_security()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Fix gmail_credentials table security
DROP POLICY IF EXISTS "Users can manage their own gmail credentials" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Secure gmail credentials access" ON public.gmail_credentials;

CREATE POLICY "Secure gmail credentials access" 
ON public.gmail_credentials 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND validate_session_security()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Fix quotes table security 
DROP POLICY IF EXISTS "Users can manage their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Secure quotes access" ON public.quotes;

CREATE POLICY "Secure quotes access" 
ON public.quotes 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND validate_session_security()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Create function to check if user has elevated role for management functions
CREATE OR REPLACE FUNCTION public.has_elevated_role()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'supervisor')
  );
$$;

-- Enhance existing has_admin_role function to be more specific
CREATE OR REPLACE FUNCTION public.has_management_role()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER  
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'supervisor')
  );
$$;