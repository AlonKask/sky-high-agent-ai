-- Create RPC function to decrypt Gmail tokens using the service role
CREATE OR REPLACE FUNCTION public.decrypt_gmail_token(encrypted_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  decrypted_token text;
BEGIN
  -- This function should only be callable by service role or authenticated users accessing their own tokens
  -- Additional security check could be added here if needed
  
  -- Decrypt the token (this is a placeholder - in production you'd use proper encryption/decryption)
  -- For now, assuming tokens are base64 encoded but not actually encrypted
  -- In a real implementation, you'd use proper encryption with a secure key
  
  BEGIN
    -- Attempt to decode base64
    decrypted_token := convert_from(decode(encrypted_token, 'base64'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    -- If base64 decode fails, return the token as-is (might already be decrypted)
    decrypted_token := encrypted_token;
  END;
  
  RETURN decrypted_token;
END;
$function$;