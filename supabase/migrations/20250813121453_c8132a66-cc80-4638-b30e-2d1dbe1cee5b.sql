-- ===============================================
-- SECURITY FIX: CORRECT RLS ROLE ASSIGNMENT (FIXED)
-- Fix policies to use 'authenticated' role instead of 'public'
-- ===============================================

-- ===========================================
-- 1. FIX CLIENTS TABLE POLICIES
-- ===========================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enhanced clients SELECT - strict access control" ON public.clients;
DROP POLICY IF EXISTS "Enhanced clients UPDATE - owner and authorized only" ON public.clients;

-- Create corrected policies for authenticated users only
CREATE POLICY "Enhanced clients SELECT - strict access control"
ON public.clients
FOR SELECT
TO authenticated
USING (can_access_client_data_enhanced(user_id, id));

CREATE POLICY "Enhanced clients UPDATE - owner and authorized only"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id) OR can_access_client_data_enhanced(user_id, id)
)
WITH CHECK (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ===========================================
-- 2. FIX GMAIL CREDENTIALS POLICIES
-- ===========================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enhanced gmail SELECT - strict owner only" ON public.gmail_credentials;
DROP POLICY IF EXISTS "Enhanced gmail UPDATE - strict owner only" ON public.gmail_credentials;

-- Create corrected policies for authenticated users only
CREATE POLICY "Enhanced gmail SELECT - strict owner only"
ON public.gmail_credentials
FOR SELECT
TO authenticated
USING (can_access_gmail_credentials_enhanced(user_id));

CREATE POLICY "Enhanced gmail UPDATE - strict owner only"
ON public.gmail_credentials
FOR UPDATE
TO authenticated
USING (can_access_gmail_credentials_enhanced(user_id))
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 3. FIX USER SESSIONS POLICIES
-- ===========================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enhanced sessions SELECT - strict validation" ON public.user_sessions;

-- Create corrected policies for authenticated users only
CREATE POLICY "Enhanced sessions SELECT - strict validation"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (validate_session_access(user_id));

-- ===========================================
-- 4. FIX QUOTES TABLE POLICIES
-- ===========================================

-- Drop ALL existing quotes policies first
DROP POLICY IF EXISTS "Enhanced quotes SELECT - financial data protection" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes INSERT - owner only" ON public.quotes;
DROP POLICY IF EXISTS "Enhanced quotes UPDATE - restricted access" ON public.quotes;
DROP POLICY IF EXISTS "DENY all anonymous access to quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;

-- Create corrected policies for authenticated users only
CREATE POLICY "Enhanced quotes SELECT - financial data protection"
ON public.quotes
FOR SELECT
TO authenticated
USING (can_access_financial_data(user_id));

CREATE POLICY "Enhanced quotes INSERT - owner only"
ON public.quotes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enhanced quotes UPDATE - restricted access"
ON public.quotes
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ===========================================
-- 5. FIX EMAIL EXCHANGES POLICIES
-- ===========================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enhanced emails SELECT - communication protection" ON public.email_exchanges;
DROP POLICY IF EXISTS "Enhanced emails UPDATE - restricted access" ON public.email_exchanges;

-- Create corrected policies for authenticated users only
CREATE POLICY "Enhanced emails SELECT - communication protection"
ON public.email_exchanges
FOR SELECT
TO authenticated
USING (can_access_communication_data(user_id, client_id));

CREATE POLICY "Enhanced emails UPDATE - restricted access"
ON public.email_exchanges
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 6. FIX AGENT CLIENT CHAT POLICIES
-- ===========================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enhanced chat SELECT - communication protection" ON public.agent_client_chat;
DROP POLICY IF EXISTS "Enhanced chat INSERT - owner only" ON public.agent_client_chat;
DROP POLICY IF EXISTS "Enhanced chat UPDATE - owner only" ON public.agent_client_chat;

-- Create corrected policies for authenticated users only
CREATE POLICY "Enhanced chat SELECT - communication protection"
ON public.agent_client_chat
FOR SELECT
TO authenticated
USING (can_access_communication_data(user_id, client_id));

CREATE POLICY "Enhanced chat INSERT - owner only"
ON public.agent_client_chat
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enhanced chat UPDATE - owner only"
ON public.agent_client_chat
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 7. STRENGTHEN DENIAL POLICIES FOR ANONYMOUS
-- ===========================================

-- Create explicit DENY policies for public/anonymous (recreate with IF NOT EXISTS safety)
CREATE POLICY "DENY all anonymous access to quotes"
ON public.quotes
TO public
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "DENY all anonymous access to agent_client_chat" ON public.agent_client_chat;
CREATE POLICY "DENY all anonymous access to agent_client_chat"
ON public.agent_client_chat
TO public
USING (false)
WITH CHECK (false);