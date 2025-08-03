-- Fix security issues found by linter
-- Set search_path for functions that are missing it

ALTER FUNCTION public.update_teams_updated_at() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.update_client_stats() SET search_path = '';

-- These functions already have proper search_path settings:
-- can_modify_data, has_role, get_current_user_role, etc.

-- Note: The remaining linter issues are mostly configuration-related:
-- - Extension in public schema (acceptable for most use cases)
-- - Auth OTP expiry (configuration setting, not SQL issue)  
-- - Leaked password protection (configuration setting, not SQL issue)
-- - RLS enabled with no policies (need to identify which specific tables)