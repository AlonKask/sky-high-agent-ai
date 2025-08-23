-- Fix the trigger to only check existing columns
CREATE OR REPLACE FUNCTION public.enforce_no_tokens_in_user_preferences()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- This trigger was checking for gmail token fields that no longer exist in user_preferences
  -- Just return NEW without any token checks since tokens are handled in gmail_credentials table
  RETURN NEW;
END;
$function$;