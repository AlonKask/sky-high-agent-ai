-- Add RLS policies for airport_codes table to allow admin and manager roles to manage IATA codes
CREATE POLICY "Admins and managers can insert airport codes" 
ON public.airport_codes 
FOR INSERT 
TO authenticated 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update airport codes" 
ON public.airport_codes 
FOR UPDATE 
TO authenticated 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete airport codes" 
ON public.airport_codes 
FOR DELETE 
TO authenticated 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Add RLS policies for airline_codes table to allow admin and manager roles to manage IATA codes
CREATE POLICY "Admins and managers can insert airline codes" 
ON public.airline_codes 
FOR INSERT 
TO authenticated 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can update airline codes" 
ON public.airline_codes 
FOR UPDATE 
TO authenticated 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins and managers can delete airline codes" 
ON public.airline_codes 
FOR DELETE 
TO authenticated 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);