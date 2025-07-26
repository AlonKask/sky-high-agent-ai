-- Critical Security Fixes

-- 1. Fix user_roles table RLS policies to prevent privilege escalation
DROP POLICY IF EXISTS "Users can manage their own role assignments" ON public.user_roles;

-- Create secure RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only admins can assign roles" ON public.user_roles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles" ON public.user_roles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles" ON public.user_roles
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix function search paths for security
DROP FUNCTION IF EXISTS public.update_client_memory(uuid, uuid, text, jsonb, jsonb);
CREATE OR REPLACE FUNCTION public.update_client_memory(p_user_id uuid, p_client_id uuid, p_interaction_summary text, p_preferences jsonb DEFAULT '{}'::jsonb, p_pain_points jsonb DEFAULT '[]'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

-- 3. Fix other functions with mutable search paths
DROP FUNCTION IF EXISTS public.update_user_memory(uuid, text, text);
CREATE OR REPLACE FUNCTION public.update_user_memory(p_user_id uuid, p_new_context text, p_interaction_type text DEFAULT 'conversation'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

-- 4. Fix has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- 5. Create security event logging function with proper path
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, severity, details, timestamp
  ) VALUES (
    COALESCE(p_user_id, auth.uid()), 
    p_event_type, 
    p_severity, 
    p_details, 
    now()
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$function$;

-- 6. Create missing tables for security
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details jsonb DEFAULT '{}',
  timestamp timestamp with time zone DEFAULT now(),
  resolved boolean DEFAULT false,
  ip_address inet,
  user_agent text
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security events" ON public.security_events
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own security events" ON public.security_events
  FOR SELECT USING (auth.uid() = user_id);

-- 7. Create sensitive data access logging table
CREATE TABLE IF NOT EXISTS public.sensitive_data_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  client_id uuid,
  data_type text NOT NULL,
  access_reason text,
  timestamp timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text
);

ALTER TABLE public.sensitive_data_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all data access logs" ON public.sensitive_data_access
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own data access" ON public.sensitive_data_access
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can log data access" ON public.sensitive_data_access
  FOR INSERT WITH CHECK (true);