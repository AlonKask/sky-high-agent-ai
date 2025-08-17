-- Enable RLS on requests table if not already enabled  
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for requests table
CREATE POLICY "Users can view their own requests" ON public.requests
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests" ON public.requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests" ON public.requests
FOR UPDATE USING (auth.uid() = user_id);

-- Drop existing function and recreate with proper signature
DROP FUNCTION IF EXISTS public.assign_request_to_agent(uuid, uuid);

CREATE OR REPLACE FUNCTION public.assign_request_to_agent(p_request_id uuid, p_agent_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  request_owner_id uuid;
  assigning_user_id uuid;
BEGIN
  assigning_user_id := COALESCE(p_agent_id, auth.uid());
  
  -- Get the request owner
  SELECT user_id INTO request_owner_id
  FROM public.requests
  WHERE id = p_request_id;
  
  IF request_owner_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update the request assignment
  UPDATE public.requests
  SET 
    assigned_to = assigning_user_id,
    assignment_status = 'assigned',
    updated_at = now()
  WHERE id = p_request_id;
  
  RETURN FOUND;
END;
$function$