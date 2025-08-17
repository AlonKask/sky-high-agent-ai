-- Fix critical RLS issues by properly handling dependencies

-- 1. Drop dependent gmail policies first
DROP POLICY IF EXISTS "MILITARY_GRADE_gmail_select" ON public.gmail_credentials;
DROP POLICY IF EXISTS "MILITARY_GRADE_gmail_insert" ON public.gmail_credentials;  
DROP POLICY IF EXISTS "MILITARY_GRADE_gmail_update" ON public.gmail_credentials;
DROP POLICY IF EXISTS "MILITARY_GRADE_gmail_delete" ON public.gmail_credentials;
DROP POLICY IF EXISTS "DENY all anonymous access to gmail_credentials" ON public.gmail_credentials;

-- 2. Now drop the broken functions
DROP FUNCTION IF EXISTS secure_token_access(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS secure_financial_data_access(text, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS can_access_communication_data(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS zero_trust_client_access(uuid) CASCADE;

-- 3. Create simple gmail policies
CREATE POLICY "Users can manage their own gmail credentials" ON public.gmail_credentials
  FOR ALL USING (auth.uid() = user_id);

-- 4. Fix clients table access 
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

CREATE POLICY "Users can manage their own clients" ON public.clients
  FOR ALL USING (auth.uid() = user_id);

-- 5. Fix quotes table access
DROP POLICY IF EXISTS "SECURE_quotes_select" ON public.quotes;
DROP POLICY IF EXISTS "SECURE_quotes_insert" ON public.quotes;
DROP POLICY IF EXISTS "SECURE_quotes_update" ON public.quotes;
DROP POLICY IF EXISTS "SECURE_quotes_delete" ON public.quotes;
DROP POLICY IF EXISTS "Block all anonymous access to quotes" ON public.quotes;

CREATE POLICY "Users can manage their own quotes" ON public.quotes
  FOR ALL USING (auth.uid() = user_id);

-- 6. Fix requests table access
CREATE POLICY "Users can manage their own requests" ON public.requests
  FOR ALL USING (auth.uid() = user_id);