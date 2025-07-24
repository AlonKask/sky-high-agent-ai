-- Critical Security Fix: Update all database functions with proper security settings
-- This prevents SQL injection and search_path attacks

-- 1. Fix update_user_memory function
CREATE OR REPLACE FUNCTION public.update_user_memory(p_user_id uuid, p_new_context text, p_interaction_type text DEFAULT 'conversation'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.user_memories (user_id, summary, last_updated)
  VALUES (p_user_id, p_new_context, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    summary = CASE 
      WHEN length(user_memories.summary) > 2000 
      THEN substring(user_memories.summary from 500) || E'\n\n' || p_new_context
      ELSE user_memories.summary || E'\n\n' || p_new_context
    END,
    last_updated = now(),
    memory_version = user_memories.memory_version + 1;
END;
$function$;

-- 2. Fix update_client_memory function
CREATE OR REPLACE FUNCTION public.update_client_memory(p_user_id uuid, p_client_id uuid, p_interaction_summary text, p_preferences jsonb DEFAULT '{}'::jsonb, p_pain_points jsonb DEFAULT '[]'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.client_memories (
    user_id, 
    client_id, 
    relationship_summary, 
    preferences, 
    pain_points,
    last_interaction,
    last_updated
  )
  VALUES (p_user_id, p_client_id, p_interaction_summary, p_preferences, p_pain_points, now(), now())
  ON CONFLICT (user_id, client_id) 
  DO UPDATE SET 
    relationship_summary = CASE 
      WHEN length(client_memories.relationship_summary) > 1500 
      THEN substring(client_memories.relationship_summary from 300) || E'\n\n' || p_interaction_summary
      ELSE client_memories.relationship_summary || E'\n\n' || p_interaction_summary
    END,
    preferences = client_memories.preferences || p_preferences,
    pain_points = client_memories.pain_points || p_pain_points,
    last_interaction = now(),
    last_updated = now(),
    memory_version = client_memories.memory_version + 1;
END;
$function$;

-- 3. Fix archive_old_communications function
CREATE OR REPLACE FUNCTION public.archive_old_communications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Archive emails older than 90 days
  INSERT INTO public.communication_archive (
    user_id, client_id, communication_type, content_summary, 
    original_content, original_date, retention_expiry
  )
  SELECT 
    user_id, client_id, 'email', 
    LEFT(subject || ': ' || body, 500),
    jsonb_build_object(
      'subject', subject,
      'body', body,
      'sender_email', sender_email,
      'recipient_emails', recipient_emails
    ),
    created_at,
    now() + INTERVAL '7 years'
  FROM public.email_exchanges 
  WHERE created_at < now() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.communication_archive 
    WHERE communication_archive.user_id = email_exchanges.user_id 
    AND communication_archive.client_id = email_exchanges.client_id
    AND communication_archive.original_date = email_exchanges.created_at
  );
  
  -- Delete archived emails
  DELETE FROM public.email_exchanges 
  WHERE created_at < now() - INTERVAL '90 days';
END;
$function$;

-- 4. Fix archive_old_emails function
CREATE OR REPLACE FUNCTION public.archive_old_emails()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  -- Archive emails older than 30 days to archives table
  INSERT INTO public.email_archives (
    user_id, message_id, thread_id, subject, sender_email, 
    archived_date, original_data, folder_name
  )
  SELECT 
    user_id, message_id, thread_id, subject, sender_email,
    now(), 
    jsonb_build_object(
      'body', body,
      'recipient_emails', recipient_emails,
      'cc_emails', cc_emails,
      'bcc_emails', bcc_emails,
      'metadata', metadata,
      'attachments', attachments,
      'created_at', created_at
    ),
    CASE 
      WHEN metadata->>'gmail_labels' LIKE '%SENT%' THEN 'sent'
      WHEN metadata->>'gmail_labels' LIKE '%DRAFT%' THEN 'drafts'
      WHEN metadata->>'gmail_labels' LIKE '%SPAM%' THEN 'spam'
      WHEN metadata->>'gmail_labels' LIKE '%TRASH%' THEN 'trash'
      ELSE 'inbox'
    END
  FROM public.email_exchanges 
  WHERE created_at < now() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.email_archives 
    WHERE email_archives.message_id = email_exchanges.message_id
    AND email_archives.user_id = email_exchanges.user_id
  );
  
  -- Delete archived emails from main table
  DELETE FROM public.email_exchanges 
  WHERE created_at < now() - INTERVAL '30 days';
END;
$function$;

-- 5. Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- 6. Fix get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$function$;

-- 7. Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- 8. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name'
    );
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$function$;

-- 9. Fix create_notification function
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_type text DEFAULT 'info'::text, p_priority text DEFAULT 'medium'::text, p_action_url text DEFAULT NULL::text, p_related_id uuid DEFAULT NULL::uuid, p_related_type text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id, title, message, type, priority, 
        action_url, related_id, related_type
    )
    VALUES (
        p_user_id, p_title, p_message, p_type, p_priority,
        p_action_url, p_related_id, p_related_type
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$function$;

-- 10. Fix update_client_stats function
CREATE OR REPLACE FUNCTION public.update_client_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.clients 
        SET 
            total_bookings = total_bookings + 1,
            total_spent = total_spent + NEW.total_price,
            last_trip_date = GREATEST(last_trip_date, NEW.departure_date::DATE)
        WHERE id = NEW.client_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.clients 
        SET 
            total_spent = total_spent - OLD.total_price + NEW.total_price
        WHERE id = NEW.client_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.clients 
        SET 
            total_bookings = total_bookings - 1,
            total_spent = total_spent - OLD.total_price
        WHERE id = OLD.client_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

-- Create audit logging system
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    session_id TEXT
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (true);

-- Create audit function
CREATE OR REPLACE FUNCTION public.create_audit_log(
    p_table_name TEXT,
    p_operation TEXT,
    p_record_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id, table_name, operation, record_id, 
        old_values, new_values, timestamp
    ) VALUES (
        auth.uid(), p_table_name, p_operation, p_record_id,
        p_old_values, p_new_values, now()
    );
END;
$$;

-- Create sensitive data tracking table
CREATE TABLE public.sensitive_data_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    accessed_user_id UUID REFERENCES auth.users(id),
    client_id UUID,
    data_type TEXT NOT NULL CHECK (data_type IN ('client_info', 'payment_data', 'personal_data', 'financial_data')),
    access_reason TEXT,
    ip_address INET,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sensitive_data_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data access" ON public.sensitive_data_access
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can log data access" ON public.sensitive_data_access
FOR INSERT WITH CHECK (true);

-- Create data retention policy table
CREATE TABLE public.data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL UNIQUE,
    retention_period INTERVAL NOT NULL,
    auto_delete BOOLEAN DEFAULT true,
    compliance_rule TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default retention policies for GDPR compliance
INSERT INTO public.data_retention_policies (table_name, retention_period, compliance_rule) VALUES
('email_exchanges', INTERVAL '7 years', 'GDPR Article 5'),
('client_memories', INTERVAL '7 years', 'GDPR Article 5'),
('communication_archive', INTERVAL '7 years', 'GDPR Article 5'),
('audit_logs', INTERVAL '10 years', 'SOX Compliance'),
('bookings', INTERVAL '7 years', 'Financial Records Retention');

-- Create encryption key management table
CREATE TABLE public.encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name TEXT NOT NULL UNIQUE,
    key_version INTEGER NOT NULL DEFAULT 1,
    algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'deprecated', 'revoked'))
);

ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage encryption keys
CREATE POLICY "Admins can manage encryption keys" ON public.encryption_keys
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add encrypted fields to clients table for sensitive data
ALTER TABLE public.clients 
ADD COLUMN encrypted_ssn TEXT,
ADD COLUMN encrypted_passport_number TEXT,
ADD COLUMN encrypted_payment_info JSONB,
ADD COLUMN encryption_key_id UUID REFERENCES public.encryption_keys(id),
ADD COLUMN data_classification TEXT DEFAULT 'confidential' CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted'));

-- Create session management table for enhanced security
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    session_token TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '8 hours'),
    is_active BOOLEAN NOT NULL DEFAULT true,
    mfa_verified BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON public.user_sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage sessions" ON public.user_sessions
FOR ALL WITH CHECK (true);

-- Create security events table for monitoring
CREATE TABLE public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login_attempt', 'login_success', 'login_failure', 
        'password_change', 'email_change', 'mfa_enabled', 'mfa_disabled',
        'suspicious_activity', 'data_export', 'admin_action',
        'failed_authorization', 'rate_limit_exceeded'
    )),
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security events" ON public.security_events
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can log security events" ON public.security_events
FOR INSERT WITH CHECK (true);

-- Create GDPR compliance table for consent management
CREATE TABLE public.gdpr_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    consent_type TEXT NOT NULL CHECK (consent_type IN (
        'data_processing', 'marketing', 'analytics', 'cookies', 'data_sharing'
    )),
    consent_given BOOLEAN NOT NULL,
    consent_version TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    withdrawal_timestamp TIMESTAMPTZ,
    UNIQUE(user_id, consent_type, consent_version)
);

ALTER TABLE public.gdpr_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consent" ON public.gdpr_consent
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own consent" ON public.gdpr_consent
FOR ALL USING (auth.uid() = user_id);

-- Create data export requests table for GDPR Article 20
CREATE TABLE public.data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion', 'rectification')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    export_url TEXT,
    admin_notes TEXT
);

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data requests" ON public.data_export_requests
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create data requests" ON public.data_export_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all data requests" ON public.data_export_requests
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));