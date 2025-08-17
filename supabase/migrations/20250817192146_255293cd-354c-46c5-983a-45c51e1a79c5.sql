-- Fix clients table RLS policy - ensure only users can access their own clients
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;

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
DROP POLICY IF EXISTS "System can create satisfaction scores" ON public.client_satisfaction_scores;

-- Only agents can view scores for their own clients
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

-- System can insert satisfaction scores
CREATE POLICY "System can create satisfaction scores" 
ON public.client_satisfaction_scores 
FOR INSERT 
WITH CHECK (true);

-- Ensure RLS is enabled on both tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_satisfaction_scores ENABLE ROW LEVEL SECURITY;