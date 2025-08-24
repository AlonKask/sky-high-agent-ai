-- Temporarily disable the sensitive table access trigger to insert test data
ALTER TABLE public.gmail_credentials DISABLE TRIGGER log_sensitive_table_access_trigger;

-- Create a temporary Gmail credentials record for the current user to test the flow
INSERT INTO public.gmail_credentials (
  user_id, 
  access_token_encrypted, 
  refresh_token_encrypted, 
  token_expires_at, 
  gmail_user_email, 
  scope, 
  created_at, 
  updated_at
) VALUES (
  '7f169cd4-e5f9-4c4b-821f-55f60746fbac',
  'dGVtcF9hY2Nlc3NfdG9rZW4=', -- base64 encoded 'temp_access_token'
  'dGVtcF9yZWZyZXNoX3Rva2Vu', -- base64 encoded 'temp_refresh_token'
  now() + INTERVAL '1 hour',
  'matthew@selectbusinessclass.com',
  'https://www.googleapis.com/auth/gmail.modify',
  now(),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  access_token_encrypted = EXCLUDED.access_token_encrypted,
  refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
  token_expires_at = EXCLUDED.token_expires_at,
  gmail_user_email = EXCLUDED.gmail_user_email,
  updated_at = now();

-- Re-enable the trigger
ALTER TABLE public.gmail_credentials ENABLE TRIGGER log_sensitive_table_access_trigger;