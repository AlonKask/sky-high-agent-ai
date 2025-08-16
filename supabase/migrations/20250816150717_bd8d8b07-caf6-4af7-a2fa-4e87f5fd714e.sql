-- Fix search_path security warning in mask_sensitive_data function
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE STRICT
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  result jsonb := p_data;
BEGIN
  -- Mask common sensitive fields
  IF result ? 'ssn' THEN
    result := jsonb_set(result, '{ssn}', '"***-**-****"');
  END IF;
  
  IF result ? 'passport_number' THEN
    result := jsonb_set(result, '{passport_number}', '"*******"');
  END IF;
  
  IF result ? 'credit_card' THEN
    result := jsonb_set(result, '{credit_card}', '"**** **** **** ****"');
  END IF;
  
  IF result ? 'payment_info' THEN
    result := jsonb_set(result, '{payment_info}', '"[REDACTED]"');
  END IF;
  
  RETURN result;
END;
$function$;