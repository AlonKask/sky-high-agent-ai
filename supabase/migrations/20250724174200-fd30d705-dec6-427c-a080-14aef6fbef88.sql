-- Fix critical security issues - only add RLS where missing

-- 1. Enable RLS on tables that don't have it enabled
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Add policies for data_retention_policies (admin only)
CREATE POLICY "Admins can manage retention policies" ON public.data_retention_policies
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));