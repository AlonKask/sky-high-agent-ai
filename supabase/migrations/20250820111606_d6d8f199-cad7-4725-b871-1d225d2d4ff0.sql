-- Create blocked_ips table for XSS protection and IP blocking
CREATE TABLE public.blocked_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address inet NOT NULL UNIQUE,
  blocked_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  reason text NOT NULL DEFAULT 'security_violation',
  block_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast IP lookups
CREATE INDEX idx_blocked_ips_address ON public.blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_expires ON public.blocked_ips(expires_at);

-- Enable RLS
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - only system/service role can manage blocked IPs
CREATE POLICY "System can manage blocked IPs" 
ON public.blocked_ips 
FOR ALL 
USING (current_setting('role') = 'service_role' OR current_setting('role') = 'postgres');

-- Add missing DELETE policies for client_memories table
CREATE POLICY "Users can delete their own client memories" 
ON public.client_memories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Strengthen clients table RLS with explicit authentication check
DROP POLICY IF EXISTS "clients_absolute_isolation" ON public.clients;
CREATE POLICY "Enhanced clients isolation" 
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

-- Add function to clean up expired blocked IPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_blocked_ips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.blocked_ips 
  WHERE expires_at < now();
END;
$function$;