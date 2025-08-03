-- Create booking_classes table
CREATE TABLE public.booking_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_class_code TEXT NOT NULL,
  airline_id UUID REFERENCES public.airline_codes(id) ON DELETE CASCADE,
  service_class TEXT NOT NULL CHECK (service_class IN ('Economy', 'Premium Economy', 'Business', 'First')),
  class_description TEXT,
  booking_priority INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(booking_class_code, airline_id)
);

-- Enable RLS
ALTER TABLE public.booking_classes ENABLE ROW LEVEL SECURITY;

-- Create policies for admin and manager access
CREATE POLICY "Admins and managers can view booking classes" 
ON public.booking_classes 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can insert booking classes" 
ON public.booking_classes 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update booking classes" 
ON public.booking_classes 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can delete booking classes" 
ON public.booking_classes 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_booking_classes_updated_at
BEFORE UPDATE ON public.booking_classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();