-- Add foreign key constraints to client_assignments table
ALTER TABLE public.client_assignments 
ADD CONSTRAINT fk_client_assignments_client_id 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.client_assignments 
ADD CONSTRAINT fk_client_assignments_agent_id 
FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.client_assignments 
ADD CONSTRAINT fk_client_assignments_assigned_by 
FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE CASCADE;