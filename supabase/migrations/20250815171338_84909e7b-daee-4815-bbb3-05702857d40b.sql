-- Add a function to handle request assignment
CREATE OR REPLACE FUNCTION assign_request_to_agent(
  p_request_id UUID,
  p_agent_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update the request assignment
  UPDATE requests 
  SET 
    assigned_to = p_agent_id,
    assignment_status = 'assigned',
    updated_at = now()
  WHERE id = p_request_id 
    AND assignment_status = 'available'
    AND assigned_to IS NULL;
  
  -- Check if the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not available for assignment or already assigned';
  END IF;
END;
$$;