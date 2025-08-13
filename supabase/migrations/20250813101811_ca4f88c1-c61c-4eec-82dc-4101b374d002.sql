-- TASK 2: SECURE COMMUNICATION DATA AND AUDIT TABLES
-- Addressing remaining security vulnerabilities

-- =====================================================
-- 1. EMAIL EXCHANGES - SECURE PRIVATE COMMUNICATIONS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own email exchanges" ON public.email_exchanges;
DROP POLICY IF EXISTS "Users can delete their own email exchanges" ON public.email_exchanges;
DROP POLICY IF EXISTS "Users can update their own email exchanges" ON public.email_exchanges;
DROP POLICY IF EXISTS "Users can view their own email exchanges" ON public.email_exchanges;

-- Create restrictive communication access policy
CREATE POLICY "Secure communication access" ON public.email_exchanges
FOR ALL USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- =====================================================
-- 2. AGENT CLIENT CHAT - SECURE PRIVATE CHATS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create chat messages" ON public.agent_client_chat;
DROP POLICY IF EXISTS "Users can update their chat messages" ON public.agent_client_chat;
DROP POLICY IF EXISTS "Users can view chat for their reviews" ON public.agent_client_chat;

-- Create secure chat access policy
CREATE POLICY "Secure chat access" ON public.agent_client_chat
FOR ALL USING (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- =====================================================
-- 3. SECURITY EVENTS - LOCK DOWN AUDIT TABLES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage security events" ON public.security_events;
DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;

-- Create admin-only access for security events
CREATE POLICY "Admin only security events access" ON public.security_events
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- System can insert security events
CREATE POLICY "System security event logging" ON public.security_events
FOR INSERT WITH CHECK (true);

-- =====================================================
-- 4. AUDIT LOGS - LOCK DOWN AUDIT SYSTEM
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create admin-only access for audit logs
CREATE POLICY "Admin only audit logs access" ON public.audit_logs
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- System can insert audit logs
CREATE POLICY "System audit logging" ON public.audit_logs
FOR INSERT WITH CHECK (true);

-- =====================================================
-- 5. ENCRYPTION AUDIT LOG - SECURE ENCRYPTION TRACKING
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Only admins can view encryption audit logs" ON public.encryption_audit_log;
DROP POLICY IF EXISTS "System can insert encryption audit logs" ON public.encryption_audit_log;

-- Create admin-only access for encryption audit logs
CREATE POLICY "Admin only encryption audit access" ON public.encryption_audit_log
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- System can insert encryption audit logs
CREATE POLICY "System encryption audit logging" ON public.encryption_audit_log
FOR INSERT WITH CHECK (true);

-- =====================================================
-- 6. REQUESTS - SECURE REQUEST DATA
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Supervisors can view team requests" ON public.requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;

-- Create secure request access policy
CREATE POLICY "Secure request access" ON public.requests
FOR ALL USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'supervisor'::public.app_role) OR
    public.has_role(auth.uid(), 'manager'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
) WITH CHECK (
  auth.uid() = user_id
);

-- Log security enhancement completion
INSERT INTO public.security_events (
  user_id, event_type, severity, details
) VALUES (
  auth.uid(),
  'security_enhancement_applied',
  'high',
  jsonb_build_object(
    'enhancement_phase', 'Task 2 - Communication & Audit Security',
    'tables_secured', jsonb_build_array(
      'email_exchanges', 
      'agent_client_chat', 
      'security_events', 
      'audit_logs', 
      'encryption_audit_log',
      'requests'
    ),
    'privacy_vulnerabilities_addressed', 2,
    'audit_tables_locked_down', 3,
    'timestamp', now()
  )
);