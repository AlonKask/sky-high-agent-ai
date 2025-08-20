-- First, drop the existing function to fix the naming conflict
DROP FUNCTION IF EXISTS public.check_advanced_rate_limit(text, text, integer, integer);

-- Now proceed with the security fixes

-- Security Fix 1: Clean up conflicting RLS policies on clients table
DROP POLICY IF EXISTS "Secure clients access" ON public.clients;
DROP POLICY IF EXISTS "Secure clients delete" ON public.clients;
DROP POLICY IF EXISTS "Secure clients modification" ON public.clients;
DROP POLICY IF EXISTS "Secure clients update" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;

-- Create new consolidated, secure RLS policies for clients
CREATE POLICY "clients_select_own_data_only" ON public.clients
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clients_insert_own_data_only" ON public.clients
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_update_own_data_only" ON public.clients
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_delete_own_data_only" ON public.clients
FOR DELETE USING (auth.uid() = user_id);

-- Security Fix 2: Clean up and strengthen quotes table RLS
DROP POLICY IF EXISTS "Secure quotes access" ON public.quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;

-- Create secure quotes policies with financial data protection
CREATE POLICY "quotes_select_own_data_only" ON public.quotes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "quotes_insert_own_data_only" ON public.quotes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotes_update_own_data_only" ON public.quotes
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotes_delete_own_data_only" ON public.quotes
FOR DELETE USING (auth.uid() = user_id);