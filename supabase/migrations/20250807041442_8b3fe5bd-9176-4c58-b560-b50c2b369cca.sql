-- Add enhanced passenger pricing fields to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS adult_markup numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS child_markup numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS infant_markup numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS detailed_passenger_breakdown jsonb DEFAULT '{}'::jsonb;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quotes_passenger_breakdown 
ON public.quotes USING gin(detailed_passenger_breakdown);

-- Create function to calculate passenger totals
CREATE OR REPLACE FUNCTION public.calculate_passenger_totals(
  p_adults_count integer DEFAULT 1,
  p_children_count integer DEFAULT 0,
  p_infants_count integer DEFAULT 0,
  p_adult_net_price numeric DEFAULT 0,
  p_child_net_price numeric DEFAULT 0,
  p_infant_net_price numeric DEFAULT 0,
  p_adult_markup numeric DEFAULT 0,
  p_child_markup numeric DEFAULT 0,
  p_infant_markup numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  total_net numeric := 0;
  total_markup numeric := 0;
  total_price numeric := 0;
BEGIN
  -- Calculate totals
  total_net := (p_adults_count * p_adult_net_price) + 
               (p_children_count * p_child_net_price) + 
               (p_infants_count * p_infant_net_price);
               
  total_markup := (p_adults_count * p_adult_markup) + 
                  (p_children_count * p_child_markup) + 
                  (p_infants_count * p_infant_markup);
                  
  total_price := total_net + total_markup;
  
  -- Build result
  result := jsonb_build_object(
    'breakdown', jsonb_build_object(
      'adults', jsonb_build_object(
        'count', p_adults_count,
        'net_price', p_adult_net_price,
        'markup', p_adult_markup,
        'sell_price', p_adult_net_price + p_adult_markup,
        'total_net', p_adults_count * p_adult_net_price,
        'total_markup', p_adults_count * p_adult_markup,
        'total_sell', p_adults_count * (p_adult_net_price + p_adult_markup)
      ),
      'children', jsonb_build_object(
        'count', p_children_count,
        'net_price', p_child_net_price,
        'markup', p_child_markup,
        'sell_price', p_child_net_price + p_child_markup,
        'total_net', p_children_count * p_child_net_price,
        'total_markup', p_children_count * p_child_markup,
        'total_sell', p_children_count * (p_child_net_price + p_child_markup)
      ),
      'infants', jsonb_build_object(
        'count', p_infants_count,
        'net_price', p_infant_net_price,
        'markup', p_infant_markup,
        'sell_price', p_infant_net_price + p_infant_markup,
        'total_net', p_infants_count * p_infant_net_price,
        'total_markup', p_infants_count * p_infant_markup,
        'total_sell', p_infants_count * (p_infant_net_price + p_infant_markup)
      )
    ),
    'totals', jsonb_build_object(
      'total_passengers', p_adults_count + p_children_count + p_infants_count,
      'total_net', total_net,
      'total_markup', total_markup,
      'total_price', total_price
    )
  );
  
  RETURN result;
END;
$function$;