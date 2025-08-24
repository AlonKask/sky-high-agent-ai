-- Fix the debug function with proper column aliases
DROP FUNCTION public.debug_gmail_credentials_state();

CREATE OR REPLACE FUNCTION public.debug_gmail_credentials_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  gmail_count integer;
  total_email_count integer;
  users_with_emails jsonb;
BEGIN
  -- Count gmail credentials
  SELECT COUNT(*) INTO gmail_count FROM public.gmail_credentials;
  
  -- Count total emails
  SELECT COUNT(*) INTO total_email_count FROM public.email_exchanges;
  
  -- Get users with emails but no credentials
  SELECT jsonb_agg(jsonb_build_object('user_id', orphaned.user_id, 'email_count', orphaned.user_email_count))
  INTO users_with_emails
  FROM (
    SELECT ee.user_id, COUNT(*) as user_email_count
    FROM public.email_exchanges ee
    LEFT JOIN public.gmail_credentials gc ON ee.user_id = gc.user_id
    WHERE gc.user_id IS NULL
    GROUP BY ee.user_id
  ) orphaned;
  
  result := jsonb_build_object(
    'gmail_credentials_count', gmail_count,
    'total_emails', total_email_count,
    'users_with_emails_no_credentials', users_with_emails,
    'diagnosis', 'Users have emails but missing Gmail credentials - likely OAuth flow never completed properly',
    'timestamp', now()
  );
  
  RETURN result;
END;
$function$;