-- Fix function search path issues for security compliance
-- Move extensions from public schema and fix function search paths

-- Update functions with proper search_path settings
CREATE OR REPLACE FUNCTION public.update_client_memory(p_user_id uuid, p_client_id uuid, p_interaction_summary text, p_preferences jsonb DEFAULT '{}'::jsonb, p_pain_points jsonb DEFAULT '[]'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.update_user_memory(p_user_id uuid, p_new_context text, p_interaction_type text DEFAULT 'conversation'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Enable leaked password protection
UPDATE auth.config SET enable_password_policy = true;

-- Set proper OTP expiry (24 hours instead of default)
UPDATE auth.config SET otp_expiry = 86400;