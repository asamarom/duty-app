-- Create signup request status enum
CREATE TYPE public.signup_request_status AS ENUM ('pending', 'approved', 'declined');

-- Create signup_requests table
CREATE TABLE public.signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  service_number TEXT NOT NULL,
  phone TEXT,
  requested_unit_type TEXT NOT NULL CHECK (requested_unit_type IN ('battalion', 'platoon', 'squad')),
  requested_battalion_id UUID REFERENCES public.battalions(id),
  requested_platoon_id UUID REFERENCES public.platoons(id),
  requested_squad_id UUID REFERENCES public.squads(id),
  status signup_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  decline_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_unit_assignments table (links admins to their units)
CREATE TABLE public.admin_unit_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('battalion', 'platoon', 'squad')),
  battalion_id UUID REFERENCES public.battalions(id),
  platoon_id UUID REFERENCES public.platoons(id),
  squad_id UUID REFERENCES public.squads(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, unit_type, battalion_id, platoon_id, squad_id)
);

-- Enable RLS
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_unit_assignments ENABLE ROW LEVEL SECURITY;

-- Function to check if an admin can manage a unit (hierarchical)
CREATE OR REPLACE FUNCTION public.can_admin_manage_unit(
  _admin_user_id UUID,
  _unit_type TEXT,
  _battalion_id UUID,
  _platoon_id UUID,
  _squad_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Admin is assigned to the exact unit
    SELECT 1 FROM public.admin_unit_assignments a
    WHERE a.user_id = _admin_user_id
    AND (
      -- Battalion admin can manage battalion, its platoons and squads
      (a.unit_type = 'battalion' AND a.battalion_id = _battalion_id)
      OR
      -- Battalion admin can manage platoons in their battalion
      (a.unit_type = 'battalion' AND _unit_type = 'platoon' AND EXISTS (
        SELECT 1 FROM public.platoons p WHERE p.id = _platoon_id AND p.battalion_id = a.battalion_id
      ))
      OR
      -- Battalion admin can manage squads in their battalion
      (a.unit_type = 'battalion' AND _unit_type = 'squad' AND EXISTS (
        SELECT 1 FROM public.squads s
        JOIN public.platoons p ON s.platoon_id = p.id
        WHERE s.id = _squad_id AND p.battalion_id = a.battalion_id
      ))
      OR
      -- Platoon admin can manage their platoon and its squads
      (a.unit_type = 'platoon' AND a.platoon_id = _platoon_id)
      OR
      -- Platoon admin can manage squads in their platoon
      (a.unit_type = 'platoon' AND _unit_type = 'squad' AND EXISTS (
        SELECT 1 FROM public.squads s WHERE s.id = _squad_id AND s.platoon_id = a.platoon_id
      ))
      OR
      -- Squad admin can only manage their squad
      (a.unit_type = 'squad' AND a.squad_id = _squad_id)
    )
  )
  OR has_role(_admin_user_id, 'admin')
$$;

-- RLS policies for signup_requests
CREATE POLICY "Users can view their own requests"
ON public.signup_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests"
ON public.signup_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view requests for their units"
ON public.signup_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'leader') AND can_admin_manage_unit(
    auth.uid(),
    requested_unit_type,
    requested_battalion_id,
    requested_platoon_id,
    requested_squad_id
  )
);

CREATE POLICY "Admins can update requests for their units"
ON public.signup_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'leader') AND can_admin_manage_unit(
    auth.uid(),
    requested_unit_type,
    requested_battalion_id,
    requested_platoon_id,
    requested_squad_id
  )
);

-- RLS policies for admin_unit_assignments
CREATE POLICY "Admins can manage unit assignments"
ON public.admin_unit_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own assignments"
ON public.admin_unit_assignments
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_signup_requests_updated_at
BEFORE UPDATE ON public.signup_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();