-- Phase 1: Database Schema Changes

-- 1.1 Add created_by column to equipment table
ALTER TABLE public.equipment ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- 1.2 Add quantity column to equipment_assignments
ALTER TABLE public.equipment_assignments ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;

-- 1.3 Create equipment_transfer_history table
CREATE TABLE public.equipment_transfer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- From location
  from_unit_type TEXT NOT NULL,
  from_battalion_id UUID REFERENCES public.battalions(id),
  from_company_id UUID REFERENCES public.companies(id),
  from_platoon_id UUID REFERENCES public.platoons(id),
  from_personnel_id UUID REFERENCES public.personnel(id),
  
  -- To location
  to_unit_type TEXT NOT NULL,
  to_battalion_id UUID REFERENCES public.battalions(id),
  to_company_id UUID REFERENCES public.companies(id),
  to_platoon_id UUID REFERENCES public.platoons(id),
  to_personnel_id UUID REFERENCES public.personnel(id),
  
  -- Metadata
  transferred_by UUID REFERENCES auth.users(id),
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on transfer history
ALTER TABLE public.equipment_transfer_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for equipment_transfer_history
CREATE POLICY "Authenticated users can view transfer history"
ON public.equipment_transfer_history
FOR SELECT
USING (true);

CREATE POLICY "Admins and leaders can insert transfer history"
ON public.equipment_transfer_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));

-- Update equipment deletion policy - only creator can delete when assigned to them
-- First drop existing ALL policy that allows leaders to manage equipment
DROP POLICY IF EXISTS "Admins and leaders can manage equipment" ON public.equipment;

-- Create separate policies for different operations
CREATE POLICY "Admins and leaders can insert equipment"
ON public.equipment
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));

CREATE POLICY "Admins and leaders can update equipment"
ON public.equipment
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));

CREATE POLICY "Creator can delete equipment when assigned to them"
ON public.equipment
FOR DELETE
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.equipment_assignments ea
    JOIN public.personnel p ON ea.personnel_id = p.id
    WHERE ea.equipment_id = equipment.id
    AND ea.returned_at IS NULL
    AND p.user_id = auth.uid()
  )
);

-- Admins can always delete
CREATE POLICY "Admins can delete any equipment"
ON public.equipment
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_equipment_transfer_history_equipment_id ON public.equipment_transfer_history(equipment_id);
CREATE INDEX idx_equipment_created_by ON public.equipment(created_by);