-- Fix security issues part 2 (after checking existing policies)

-- 1. Create security events table if it doesn't exist
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

-- Enable RLS on security_events if not already enabled
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- 2. Create sensitive data access logging table
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

-- 3. Create security event logging function with proper path
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

-- 4. Update existing functions to have secure search paths
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