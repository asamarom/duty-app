-- Add battalion_id and platoon_id columns to personnel table
ALTER TABLE public.personnel 
ADD COLUMN battalion_id uuid REFERENCES public.battalions(id) ON DELETE SET NULL,
ADD COLUMN platoon_id uuid REFERENCES public.platoons(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_personnel_battalion_id ON public.personnel(battalion_id);
CREATE INDEX idx_personnel_platoon_id ON public.personnel(platoon_id);