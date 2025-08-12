-- Restrict messages visibility to owners and privileged roles
-- 1) Remove overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view all messages" ON public.messages;

-- 2) Allow users to view only their own messages
CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
USING (auth.uid() = user_id);

-- 3) Allow supervisors/managers/admins to view all messages
CREATE POLICY "Supervisors can view all messages"
ON public.messages
FOR SELECT
USING (
  has_role(auth.uid(), 'supervisor'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);
