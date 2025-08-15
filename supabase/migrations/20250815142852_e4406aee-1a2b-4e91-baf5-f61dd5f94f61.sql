-- Fix the search_path security warning for log_captcha_verification function
CREATE OR REPLACE FUNCTION public.log_captcha_verification(
  p_user_email TEXT,
  p_result BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.captcha_verifications (
    user_email, verification_result, error_message, ip_address, user_agent
  ) VALUES (
    p_user_email, p_result, p_error_message, p_ip_address, p_user_agent
  );
END;
$function$;