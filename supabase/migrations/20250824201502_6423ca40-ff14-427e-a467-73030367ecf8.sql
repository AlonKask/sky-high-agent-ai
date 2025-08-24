-- Enable pgcrypto extension for OAuth state token generation
-- This extension provides the gen_random_bytes function needed for secure token generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify the extension is working by testing gen_random_bytes function
-- This should not fail after the extension is enabled
DO $$
BEGIN
  -- Test that gen_random_bytes works
  IF gen_random_bytes(32) IS NULL THEN
    RAISE EXCEPTION 'pgcrypto extension not working properly';
  END IF;
  
  RAISE NOTICE 'pgcrypto extension enabled successfully - gen_random_bytes function is working';
END $$;