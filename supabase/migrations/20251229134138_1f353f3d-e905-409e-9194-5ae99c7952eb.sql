-- Create enum for assignment request status
CREATE TYPE public.assignment_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create assignment_requests table
CREATE TABLE public.assignment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  
  -- Current assignment info
  from_unit_type TEXT NOT NULL,
  from_battalion_id UUID REFERENCES public.battalions(id),
  from_platoon_id UUID REFERENCES public.platoons(id),
  from_squad_id UUID REFERENCES public.squads(id),
  from_personnel_id UUID REFERENCES public.personnel(id),
  
  -- Target assignment info
  to_unit_type TEXT NOT NULL,
  to_battalion_id UUID REFERENCES public.battalions(id),
  to_platoon_id UUID REFERENCES public.platoons(id),
  to_squad_id UUID REFERENCES public.squads(id),
  to_personnel_id UUID REFERENCES public.personnel(id),
  
  status assignment_request_status NOT NULL DEFAULT 'pending',
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignment_approvals table for history
CREATE TABLE public.assignment_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.assignment_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  action_by UUID REFERENCES auth.users(id),
  action_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assignment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignment_requests
CREATE POLICY "Admins and leaders can view assignment requests"
ON public.assignment_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'leader'));

CREATE POLICY "Admins and leaders can create assignment requests"
ON public.assignment_requests
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'leader'));

CREATE POLICY "Admins and leaders can update assignment requests"
ON public.assignment_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'leader'));

-- RLS Policies for assignment_approvals
CREATE POLICY "Admins and leaders can view assignment approvals"
ON public.assignment_approvals
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'leader'));

CREATE POLICY "Admins and leaders can create assignment approvals"
ON public.assignment_approvals
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'leader'));

-- Triggers for updated_at
CREATE TRIGGER update_assignment_requests_updated_at
BEFORE UPDATE ON public.assignment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();