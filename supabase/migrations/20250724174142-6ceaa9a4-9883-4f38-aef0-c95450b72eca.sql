-- Fix critical security issues identified by the linter

-- 1. Enable RLS on tables that don't have it enabled
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- Add policies for data_retention_policies (admin only)
CREATE POLICY "Admins can manage retention policies" ON public.data_retention_policies
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add policies for encryption_keys (admin only)
CREATE POLICY "Admins can manage encryption keys" ON public.encryption_keys
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));