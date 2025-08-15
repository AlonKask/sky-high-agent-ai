-- Add CAPTCHA configuration tracking table for monitoring
CREATE TABLE IF NOT EXISTS public.captcha_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  verification_result BOOLEAN NOT NULL,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.captcha_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admin can view captcha logs" 
ON public.captcha_verifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add index for performance
CREATE INDEX idx_captcha_verifications_created_at ON public.captcha_verifications(created_at);
CREATE INDEX idx_captcha_verifications_result ON public.captcha_verifications(verification_result);

-- Add function to log CAPTCHA verification attempts
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
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.captcha_verifications (
    user_email, verification_result, error_message, ip_address, user_agent
  ) VALUES (
    p_user_email, p_result, p_error_message, p_ip_address, p_user_agent
  );
END;
$function$;