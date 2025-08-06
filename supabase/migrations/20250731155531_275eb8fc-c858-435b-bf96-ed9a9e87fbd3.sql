-- Create request assignments table
CREATE TABLE IF NOT EXISTS public.request_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'reassigned')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on request_assignments
ALTER TABLE public.request_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for request_assignments
CREATE POLICY "Users can view assignments in their company" 
ON public.request_assignments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create assignments" 
ON public.request_assignments 
FOR INSERT 
WITH CHECK (auth.uid() = assigned_by OR has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can update their assignments" 
ON public.request_assignments 
FOR UPDATE 
USING (auth.uid() = assigned_to OR auth.uid() = assigned_by OR has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'manager'));

-- Add client_type to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'new' CHECK (client_type IN ('new', 'return'));

-- Add request assignment status to requests table
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS assignment_status TEXT DEFAULT 'available' CHECK (assignment_status IN ('available', 'assigned', 'in_progress', 'completed'));

-- Create system metrics table for dev dashboard
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_data JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on system_metrics
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy for system_metrics (only devs can access)
CREATE POLICY "Devs can view system metrics" 
ON public.system_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'dev') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert metrics" 
ON public.system_metrics 
FOR INSERT 
WITH CHECK (true);

-- Create team performance table
CREATE TABLE IF NOT EXISTS public.team_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES auth.users(id),
  supervisor_id UUID REFERENCES auth.users(id),
  profit NUMERIC DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on team_performance
ALTER TABLE public.team_performance ENABLE ROW LEVEL SECURITY;

-- Create policies for team_performance
CREATE POLICY "Users can view their own performance" 
ON public.team_performance 
FOR SELECT 
USING (auth.uid() = team_member_id OR auth.uid() = supervisor_id OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors and managers can manage performance" 
ON public.team_performance 
FOR ALL 
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_request_assignments_request_id ON public.request_assignments(request_id);
CREATE INDEX IF NOT EXISTS idx_request_assignments_assigned_to ON public.request_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON public.clients(client_type);
CREATE INDEX IF NOT EXISTS idx_requests_assignment_status ON public.requests(assignment_status);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type_time ON public.system_metrics(metric_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_team_performance_member ON public.team_performance(team_member_id);

-- Update updated_at trigger for team_performance
CREATE TRIGGER update_team_performance_updated_at
  BEFORE UPDATE ON public.team_performance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();