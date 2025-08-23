-- Add missing RLS policies for airline_rbd_assignments table to enable CRUD operations

-- Allow business users to insert new RBD assignments
CREATE POLICY "Business users can insert airline RBD assignments" 
ON public.airline_rbd_assignments 
FOR INSERT 
TO authenticated 
WITH CHECK (is_business_user());

-- Allow business users to update existing RBD assignments
CREATE POLICY "Business users can update airline RBD assignments" 
ON public.airline_rbd_assignments 
FOR UPDATE 
TO authenticated 
USING (is_business_user()) 
WITH CHECK (is_business_user());

-- Allow business users to delete RBD assignments
CREATE POLICY "Business users can delete airline RBD assignments" 
ON public.airline_rbd_assignments 
FOR DELETE 
TO authenticated 
USING (is_business_user());