-- Drop existing policies and recreate them properly for clients table
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;

-- Create granular RLS policies for clients table
CREATE POLICY "Users can view their own clients" 
ON public.clients 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" 
ON public.clients 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" 
ON public.clients 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix client_satisfaction_scores table RLS
DROP POLICY IF EXISTS "Agents can view satisfaction scores for their clients" ON public.client_satisfaction_scores;
DROP POLICY IF EXISTS "Agents can view their client satisfaction scores" ON public.client_satisfaction_scores;
DROP POLICY IF EXISTS "System can create satisfaction scores" ON public.client_satisfaction_scores;

-- Create secure policies for client satisfaction scores
CREATE POLICY "Agents can view their client satisfaction scores" 
ON public.client_satisfaction_scores 
FOR SELECT 
USING (
  auth.uid() = agent_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = client_satisfaction_scores.client_id 
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "System can create satisfaction scores" 
ON public.client_satisfaction_scores 
FOR INSERT 
WITH CHECK (true);