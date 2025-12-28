-- Add battalion_id column to equipment_assignments table
ALTER TABLE public.equipment_assignments 
ADD COLUMN battalion_id uuid REFERENCES public.battalions(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_equipment_assignments_battalion_id ON public.equipment_assignments(battalion_id);