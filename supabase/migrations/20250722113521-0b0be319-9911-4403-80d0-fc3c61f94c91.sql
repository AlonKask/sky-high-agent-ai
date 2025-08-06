-- Create memory system tables for AI assistant

-- User memory: stores ongoing context and conversation history for each user
CREATE TABLE public.user_memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary text NOT NULL DEFAULT '',
  key_preferences jsonb DEFAULT '{}',
  interaction_patterns jsonb DEFAULT '{}',
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  memory_version integer DEFAULT 1
);

-- Client memory: stores context and relationship history for each client
CREATE TABLE public.client_memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  relationship_summary text NOT NULL DEFAULT '',
  communication_history jsonb DEFAULT '{}',
  preferences jsonb DEFAULT '{}',
  pain_points jsonb DEFAULT '[]',
  opportunities jsonb DEFAULT '[]',
  last_interaction timestamp with time zone,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  memory_version integer DEFAULT 1,
  UNIQUE(user_id, client_id)
);

-- Sales opportunity memory: tracks ongoing sales processes
CREATE TABLE public.sales_memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.requests(id) ON DELETE CASCADE,
  opportunity_summary text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'prospecting',
  next_actions jsonb DEFAULT '[]',
  timeline jsonb DEFAULT '{}',
  value_proposition text,
  objections_handled jsonb DEFAULT '[]',
  success_probability integer DEFAULT 50,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  memory_version integer DEFAULT 1
);

-- Memory interactions log: tracks what memories were accessed/updated
CREATE TABLE public.memory_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type text NOT NULL, -- 'read', 'update', 'create'
  memory_type text NOT NULL, -- 'user', 'client', 'sales'
  memory_id uuid NOT NULL,
  context jsonb DEFAULT '{}',
  ai_reasoning text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all memory tables
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_memories
CREATE POLICY "Users can view their own memories" 
ON public.user_memories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memories" 
ON public.user_memories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" 
ON public.user_memories 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for client_memories
CREATE POLICY "Users can view their own client memories" 
ON public.client_memories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own client memories" 
ON public.client_memories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client memories" 
ON public.client_memories 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for sales_memories
CREATE POLICY "Users can view their own sales memories" 
ON public.sales_memories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sales memories" 
ON public.sales_memories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales memories" 
ON public.sales_memories 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for memory_interactions
CREATE POLICY "Users can view their own memory interactions" 
ON public.memory_interactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memory interactions" 
ON public.memory_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Function to update user memory summary
CREATE OR REPLACE FUNCTION public.update_user_memory(
  p_user_id uuid,
  p_new_context text,
  p_interaction_type text DEFAULT 'conversation'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to update client memory
CREATE OR REPLACE FUNCTION public.update_client_memory(
  p_user_id uuid,
  p_client_id uuid,
  p_interaction_summary text,
  p_preferences jsonb DEFAULT '{}',
  p_pain_points jsonb DEFAULT '[]'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create indexes for performance
CREATE INDEX idx_user_memories_user_id ON public.user_memories(user_id);
CREATE INDEX idx_client_memories_user_client ON public.client_memories(user_id, client_id);
CREATE INDEX idx_sales_memories_user_client ON public.sales_memories(user_id, client_id);
CREATE INDEX idx_memory_interactions_user_type ON public.memory_interactions(user_id, memory_type);