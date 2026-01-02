-- Create a function to check if a user can assign leader role
-- Admins can assign leaders anywhere
-- Leaders can assign leaders to users in their own unit or direct sub-units
CREATE OR REPLACE FUNCTION public.can_assign_leader_role(
  _assigner_user_id uuid,
  _target_personnel_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    -- Admins can assign leaders anywhere
    has_role(_assigner_user_id, 'admin'::app_role)
    OR
    -- Leaders can assign to personnel in their managed units
    (
      has_role(_assigner_user_id, 'leader'::app_role)
      AND EXISTS (
        SELECT 1 FROM personnel p
        JOIN admin_unit_assignments a ON a.user_id = _assigner_user_id
        WHERE p.id = _target_personnel_id
        AND (
          -- Leader manages a battalion - can assign to personnel in that battalion
          (a.unit_type = 'battalion' AND p.battalion_id = a.battalion_id)
          OR
          -- Leader manages a platoon - can assign to personnel in that platoon
          (a.unit_type = 'platoon' AND p.platoon_id = a.platoon_id)
          OR
          -- Leader manages a squad - can assign to personnel in that squad
          (a.unit_type = 'squad' AND p.squad_id = a.squad_id)
        )
      )
    )
$$;

-- Update RLS policy on user_roles to allow leaders to insert leader roles for users in their unit
-- First drop the existing policy
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- Create a new policy that allows admins full access
CREATE POLICY "Admins can manage all roles"
ON user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow leaders to insert leader roles for users they can manage
CREATE POLICY "Leaders can assign leader role to unit members"
ON user_roles
FOR INSERT
WITH CHECK (
  role = 'leader'::app_role
  AND has_role(auth.uid(), 'leader'::app_role)
  AND EXISTS (
    SELECT 1 FROM personnel p
    WHERE p.user_id = user_roles.user_id
    AND can_assign_leader_role(auth.uid(), p.id)
  )
);

-- Allow leaders to view roles of users in their units
CREATE POLICY "Leaders can view roles of unit members"
ON user_roles
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'leader'::app_role)
    AND EXISTS (
      SELECT 1 FROM personnel p
      JOIN admin_unit_assignments a ON a.user_id = auth.uid()
      WHERE p.user_id = user_roles.user_id
      AND (
        (a.unit_type = 'battalion' AND p.battalion_id = a.battalion_id)
        OR (a.unit_type = 'platoon' AND p.platoon_id = a.platoon_id)
        OR (a.unit_type = 'squad' AND p.squad_id = a.squad_id)
      )
    )
  )
);

-- Allow leaders to delete leader roles they assigned (within their unit)
CREATE POLICY "Leaders can remove leader role from unit members"
ON user_roles
FOR DELETE
USING (
  role = 'leader'::app_role
  AND has_role(auth.uid(), 'leader'::app_role)
  AND EXISTS (
    SELECT 1 FROM personnel p
    WHERE p.user_id = user_roles.user_id
    AND can_assign_leader_role(auth.uid(), p.id)
  )
);