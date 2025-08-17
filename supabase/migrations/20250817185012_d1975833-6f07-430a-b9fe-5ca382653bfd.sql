-- Fix critical RLS issues that prevent basic app usage

-- 1. Fix clients table access - users need to access their own clients
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients; 
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

CREATE POLICY "Users can manage their own clients" ON public.clients
  FOR ALL USING (auth.uid() = user_id);

-- 2. Fix quotes table access - users need to access their own quotes  
DROP POLICY IF EXISTS "SECURE_quotes_select" ON public.quotes;
DROP POLICY IF EXISTS "SECURE_quotes_insert" ON public.quotes;
DROP POLICY IF EXISTS "SECURE_quotes_update" ON public.quotes;
DROP POLICY IF EXISTS "SECURE_quotes_delete" ON public.quotes;
DROP POLICY IF EXISTS "Block all anonymous access to quotes" ON public.quotes;

CREATE POLICY "Users can manage their own quotes" ON public.quotes
  FOR ALL USING (auth.uid() = user_id);

-- 3. Fix requests table access - users need to access their own requests
CREATE POLICY "Users can manage their own requests" ON public.requests
  FOR ALL USING (auth.uid() = user_id);

-- 4. Remove broken security functions that cause issues
DROP FUNCTION IF EXISTS secure_financial_data_access(text, uuid, text);
DROP FUNCTION IF EXISTS secure_token_access(uuid, text);
DROP FUNCTION IF EXISTS can_access_communication_data(uuid, uuid);
DROP FUNCTION IF EXISTS zero_trust_client_access(uuid);

-- 5. Create simple working functions
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;