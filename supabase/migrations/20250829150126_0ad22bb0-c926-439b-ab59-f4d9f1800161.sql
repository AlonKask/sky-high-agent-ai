-- Fix the secure_option_review_token function to use quote_ids array instead of quote_id
CREATE OR REPLACE FUNCTION public.secure_option_review_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Generate secure token if not provided
  IF NEW.client_token IS NULL OR NEW.client_token = '' THEN
    NEW.client_token := public.generate_secure_client_token();
  END IF;
  
  -- Set expiration if not provided
  IF NEW.token_expires_at IS NULL THEN
    NEW.token_expires_at := now() + INTERVAL '7 days';
  END IF;
  
  -- Log token generation for security (use quote_ids array - get first quote if available)
  PERFORM public.log_security_event(
    'option_review_token_generated',
    'low',
    jsonb_build_object(
      'quote_ids', NEW.quote_ids,
      'first_quote_id', CASE WHEN array_length(NEW.quote_ids, 1) > 0 THEN NEW.quote_ids[1] ELSE NULL END,
      'client_id', NEW.client_id,
      'expires_at', NEW.token_expires_at
    )
  );
  
  RETURN NEW;
END;
$function$