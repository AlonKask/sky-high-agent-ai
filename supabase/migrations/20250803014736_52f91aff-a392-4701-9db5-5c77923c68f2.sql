-- Create airline RBD templates table
CREATE TABLE public.airline_rbd_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_name TEXT NOT NULL,
    airline_type TEXT NOT NULL DEFAULT 'full_service', -- 'full_service', 'low_cost', 'regional', 'charter'
    template_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create airline RBD assignments table (many-to-many)
CREATE TABLE public.airline_rbd_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    airline_id UUID NOT NULL,
    booking_class_code TEXT NOT NULL,
    service_class TEXT NOT NULL,
    class_description TEXT,
    booking_priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(airline_id, booking_class_code)
);

-- Enable RLS on new tables
ALTER TABLE public.airline_rbd_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airline_rbd_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for airline_rbd_templates
CREATE POLICY "Admins and managers can manage RBD templates" 
ON public.airline_rbd_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated users can view RBD templates" 
ON public.airline_rbd_templates 
FOR SELECT 
USING (true);

-- Create RLS policies for airline_rbd_assignments
CREATE POLICY "Admins and managers can manage airline RBD assignments" 
ON public.airline_rbd_assignments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Authenticated users can view airline RBD assignments" 
ON public.airline_rbd_assignments 
FOR SELECT 
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_airline_rbd_templates_updated_at
    BEFORE UPDATE ON public.airline_rbd_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_airline_rbd_assignments_updated_at
    BEFORE UPDATE ON public.airline_rbd_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default RBD templates
INSERT INTO public.airline_rbd_templates (template_name, airline_type, template_data, is_default) VALUES
('Full Service Standard', 'full_service', '[
    {"code": "F", "service_class": "First", "description": "First Class", "priority": 1},
    {"code": "A", "service_class": "First", "description": "First Class Discount", "priority": 2},
    {"code": "J", "service_class": "Business", "description": "Business Class", "priority": 3},
    {"code": "C", "service_class": "Business", "description": "Business Class", "priority": 4},
    {"code": "D", "service_class": "Business", "description": "Business Class Discount", "priority": 5},
    {"code": "W", "service_class": "Premium Economy", "description": "Premium Economy", "priority": 6},
    {"code": "Y", "service_class": "Economy", "description": "Economy Full Fare", "priority": 7},
    {"code": "B", "service_class": "Economy", "description": "Economy", "priority": 8},
    {"code": "M", "service_class": "Economy", "description": "Economy", "priority": 9},
    {"code": "H", "service_class": "Economy", "description": "Economy", "priority": 10},
    {"code": "Q", "service_class": "Economy", "description": "Economy", "priority": 11},
    {"code": "V", "service_class": "Economy", "description": "Economy", "priority": 12},
    {"code": "L", "service_class": "Economy", "description": "Economy Basic", "priority": 13}
]'::jsonb, true),
('Low Cost Standard', 'low_cost', '[
    {"code": "Y", "service_class": "Economy", "description": "Economy Full Fare", "priority": 1},
    {"code": "W", "service_class": "Economy", "description": "Economy Plus", "priority": 2},
    {"code": "T", "service_class": "Economy", "description": "Economy", "priority": 3},
    {"code": "Q", "service_class": "Economy", "description": "Economy", "priority": 4},
    {"code": "N", "service_class": "Economy", "description": "Economy", "priority": 5},
    {"code": "M", "service_class": "Economy", "description": "Economy", "priority": 6},
    {"code": "L", "service_class": "Economy", "description": "Economy Basic", "priority": 7},
    {"code": "G", "service_class": "Economy", "description": "Economy Basic", "priority": 8}
]'::jsonb, true),
('Regional Standard', 'regional', '[
    {"code": "Y", "service_class": "Economy", "description": "Economy Full Fare", "priority": 1},
    {"code": "B", "service_class": "Economy", "description": "Economy", "priority": 2},
    {"code": "M", "service_class": "Economy", "description": "Economy", "priority": 3},
    {"code": "H", "service_class": "Economy", "description": "Economy", "priority": 4},
    {"code": "Q", "service_class": "Economy", "description": "Economy", "priority": 5},
    {"code": "V", "service_class": "Economy", "description": "Economy", "priority": 6}
]'::jsonb, true);