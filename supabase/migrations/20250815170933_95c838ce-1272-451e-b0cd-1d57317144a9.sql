-- Fix malformed client data
UPDATE clients 
SET 
  first_name = TRIM(BOTH FROM SPLIT_PART(first_name, '<', 1)),
  last_name = COALESCE(NULLIF(TRIM(BOTH FROM last_name), ''), TRIM(BOTH FROM SPLIT_PART(first_name, '<', 2)))
WHERE first_name LIKE '%<%' 
   OR last_name = '' 
   OR last_name IS NULL;

-- Update specific malformed entries
UPDATE clients 
SET 
  first_name = 'Peter',
  last_name = 'Levin'
WHERE email = 'Peter Levin <peter.levin.colorado@gmail.com>';

UPDATE clients 
SET 
  first_name = 'Leonid',
  last_name = 'Alaev'
WHERE email = 'Leonid Alaev <leonid.alaev@gmail.com>';

UPDATE clients 
SET 
  first_name = 'Tamara',
  last_name = 'Osgood'
WHERE email = 'Tamara Osgood <tamaraeosgood@gmail.com>';

UPDATE clients 
SET 
  first_name = 'Leon',
  last_name = 'Landver'
WHERE email = 'Leon Landver <leon@mlco.us>';

UPDATE clients 
SET 
  first_name = 'Brydon',
  last_name = 'March'
WHERE email = 'Brydon March <brydonmarch@gmail.com>';

UPDATE clients 
SET 
  first_name = 'Angela',
  last_name = 'Hewitt'
WHERE email = 'Angela Hewitt <angelahewitt7@gmail.com>';

UPDATE clients 
SET 
  first_name = 'Katisha',
  last_name = 'Freeman'
WHERE email = 'Katisha Freeman <katisha@experiencetheeot.com>';

UPDATE clients 
SET 
  first_name = 'Weerayuth',
  last_name = 'Juneweeranong'
WHERE email = 'weerayuth juneweeranong <yuthhh@gmail.com>';

UPDATE clients 
SET 
  first_name = 'Silvana',
  last_name = 'Vitorino'
WHERE email = 'silvanavitorino@hotmail.com';

UPDATE clients 
SET 
  first_name = 'Awel',
  last_name = 'Muna'
WHERE email = 'awelmuna629@gmail.com';

-- Clean up email addresses
UPDATE clients 
SET email = TRIM(BOTH FROM REGEXP_REPLACE(email, '^[^<]*<([^>]+)>.*$', '\1'))
WHERE email LIKE '%<%>';

-- Set proper data classification for all clients
UPDATE clients 
SET data_classification = 'confidential'
WHERE data_classification IS NULL;

-- Add an index for better performance on client searches
CREATE INDEX IF NOT EXISTS idx_clients_name_search ON clients(first_name, last_name, email);

-- Add an index for requests by assignment status
CREATE INDEX IF NOT EXISTS idx_requests_assignment_status ON requests(assignment_status, assigned_to);

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
  
  -- Log the assignment
  PERFORM public.log_security_event(
    'request_assigned',
    'low',
    jsonb_build_object(
      'request_id', p_request_id,
      'agent_id', p_agent_id,
      'timestamp', now()
    )
  );
END;
$$;