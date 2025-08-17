-- Fix critical security vulnerability: Strengthen RLS policies for clients table
-- This addresses the "Customer Personal Information Could Be Stolen" security issue

-- First, enhance the existing clients RLS policies to be more restrictive
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients; 
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

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

-- Fix email_exchanges table security if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_exchanges') THEN
    DROP POLICY IF EXISTS "Users can manage their own email exchanges" ON public.email_exchanges;
    
    CREATE POLICY "Secure email exchanges access" 
    ON public.email_exchanges 
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
  END IF;
END $$;

-- Add security logging for sensitive data access
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  severity text,
  details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    details,
    timestamp
  ) VALUES (
    auth.uid(),
    event_type,
    severity,
    details,
    now()
  );
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the main operation if logging fails
  NULL;
END;
$$;

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