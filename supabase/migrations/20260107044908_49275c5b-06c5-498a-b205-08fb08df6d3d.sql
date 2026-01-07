-- Add battalion_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN battalion_id uuid REFERENCES public.battalions(id);

-- Create policy for admins to update any profile's battalion
CREATE POLICY "Admins can update battalion assignment"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_profiles_battalion_id ON public.profiles(battalion_id);