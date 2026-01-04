
-- Drop existing policies for assignment_requests
DROP POLICY IF EXISTS "Admins and leaders can view assignment requests" ON public.assignment_requests;
DROP POLICY IF EXISTS "Admins and leaders can create assignment requests" ON public.assignment_requests;
DROP POLICY IF EXISTS "Admins and leaders can update assignment requests" ON public.assignment_requests;

-- Drop existing policies for assignment_approvals
DROP POLICY IF EXISTS "Admins and leaders can view assignment approvals" ON public.assignment_approvals;
DROP POLICY IF EXISTS "Admins and leaders can create assignment approvals" ON public.assignment_approvals;

-- Create new policy: Admins can view all assignment requests
CREATE POLICY "Admins can view all assignment requests"
ON public.assignment_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create new policy: Leaders can view assignment requests relevant to their units
CREATE POLICY "Leaders can view unit assignment requests"
ON public.assignment_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND (
    -- Leader manages the "from" unit
    can_admin_manage_unit(auth.uid(), from_unit_type, from_battalion_id, from_platoon_id, from_squad_id)
    OR
    -- Leader manages the "to" unit
    can_admin_manage_unit(auth.uid(), to_unit_type, to_battalion_id, to_platoon_id, to_squad_id)
  )
);

-- Create new policy: Admins can create assignment requests
CREATE POLICY "Admins can create assignment requests"
ON public.assignment_requests
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create new policy: Leaders can create assignment requests for their units
CREATE POLICY "Leaders can create unit assignment requests"
ON public.assignment_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'leader'::app_role)
  AND can_admin_manage_unit(auth.uid(), from_unit_type, from_battalion_id, from_platoon_id, from_squad_id)
);

-- Create new policy: Admins can update all assignment requests
CREATE POLICY "Admins can update all assignment requests"
ON public.assignment_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create new policy: Leaders can update assignment requests for their units
CREATE POLICY "Leaders can update unit assignment requests"
ON public.assignment_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND (
    can_admin_manage_unit(auth.uid(), from_unit_type, from_battalion_id, from_platoon_id, from_squad_id)
    OR
    can_admin_manage_unit(auth.uid(), to_unit_type, to_battalion_id, to_platoon_id, to_squad_id)
  )
);

-- Create new policy: Admins can view all assignment approvals
CREATE POLICY "Admins can view all assignment approvals"
ON public.assignment_approvals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create new policy: Leaders can view assignment approvals for their unit requests
CREATE POLICY "Leaders can view unit assignment approvals"
ON public.assignment_approvals
FOR SELECT
USING (
  has_role(auth.uid(), 'leader'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.assignment_requests ar
    WHERE ar.id = request_id
    AND (
      can_admin_manage_unit(auth.uid(), ar.from_unit_type, ar.from_battalion_id, ar.from_platoon_id, ar.from_squad_id)
      OR
      can_admin_manage_unit(auth.uid(), ar.to_unit_type, ar.to_battalion_id, ar.to_platoon_id, ar.to_squad_id)
    )
  )
);

-- Create new policy: Admins can create assignment approvals
CREATE POLICY "Admins can create assignment approvals"
ON public.assignment_approvals
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create new policy: Leaders can create assignment approvals for their unit requests
CREATE POLICY "Leaders can create unit assignment approvals"
ON public.assignment_approvals
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'leader'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.assignment_requests ar
    WHERE ar.id = request_id
    AND (
      can_admin_manage_unit(auth.uid(), ar.from_unit_type, ar.from_battalion_id, ar.from_platoon_id, ar.from_squad_id)
      OR
      can_admin_manage_unit(auth.uid(), ar.to_unit_type, ar.to_battalion_id, ar.to_platoon_id, ar.to_squad_id)
    )
  )
);
