-- Migration: Remove squads hierarchy level and update terminology
-- Description: Drops the squads table, removes all squad-related columns/references, 
-- and renames transfer_approved to is_signature_approved.

-- 1. Rename transfer_approved to is_signature_approved in personnel table
ALTER TABLE public.personnel RENAME COLUMN transfer_approved TO is_signature_approved;

-- 2. Remove foreign keys from dependent tables
ALTER TABLE public.personnel DROP CONSTRAINT IF EXISTS personnel_squad_id_fkey;
ALTER TABLE public.equipment_assignments DROP CONSTRAINT IF EXISTS equipment_assignments_squad_id_fkey;
ALTER TABLE public.assignment_requests DROP CONSTRAINT IF EXISTS assignment_requests_from_squad_id_fkey;
ALTER TABLE public.assignment_requests DROP CONSTRAINT IF EXISTS assignment_requests_to_squad_id_fkey;
ALTER TABLE public.admin_unit_assignments DROP CONSTRAINT IF EXISTS admin_unit_assignments_squad_id_fkey;
ALTER TABLE public.signup_requests DROP CONSTRAINT IF EXISTS signup_requests_requested_squad_id_fkey;

-- 3. Drop columns from dependent tables
ALTER TABLE public.personnel DROP COLUMN IF EXISTS squad_id;
ALTER TABLE public.equipment_assignments DROP COLUMN IF EXISTS squad_id;
ALTER TABLE public.assignment_requests DROP COLUMN IF EXISTS from_squad_id;
ALTER TABLE public.assignment_requests DROP COLUMN IF EXISTS to_squad_id;
ALTER TABLE public.admin_unit_assignments DROP COLUMN IF EXISTS squad_id;
ALTER TABLE public.signup_requests DROP COLUMN IF EXISTS requested_squad_id;

-- 4. Drop the squads table
DROP TABLE IF EXISTS public.squads CASCADE;

-- 5. Helper function: get_user_platoon_id (Replacement for get_user_squad_id)
CREATE OR REPLACE FUNCTION public.get_user_platoon_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT platoon_id
  FROM public.personnel
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 6. Update can_admin_manage_unit function
CREATE OR REPLACE FUNCTION public.can_admin_manage_unit(
  _admin_user_id uuid, 
  _unit_type text, 
  _battalion_id uuid, 
  _platoon_id uuid,
  _company_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_unit_assignments a
    WHERE a.user_id = _admin_user_id
    AND (
      -- Battalion admin can manage battalion and everything below
      (a.unit_type = 'battalion' AND a.battalion_id = _battalion_id)
      OR
      -- Battalion admin can manage companies in their battalion
      (a.unit_type = 'battalion' AND _unit_type = 'company' AND EXISTS (
        SELECT 1 FROM public.companies c WHERE c.id = _company_id AND c.battalion_id = a.battalion_id
      ))
      OR
      -- Battalion admin can manage platoons in their battalion (via company)
      (a.unit_type = 'battalion' AND _unit_type = 'platoon' AND EXISTS (
        SELECT 1 FROM public.platoons p
        JOIN public.companies c ON p.company_id = c.id
        WHERE p.id = _platoon_id AND c.battalion_id = a.battalion_id
      ))
      OR
      -- Company admin can manage their company and its platoons
      (a.unit_type = 'company' AND a.company_id = _company_id)
      OR
      -- Company admin can manage platoons in their company
      (a.unit_type = 'company' AND _unit_type = 'platoon' AND EXISTS (
        SELECT 1 FROM public.platoons p WHERE p.id = _platoon_id AND p.company_id = a.company_id
      ))
      OR
      -- Platoon admin can only manage their platoon
      (a.unit_type = 'platoon' AND a.platoon_id = _platoon_id)
    )
  )
  OR has_role(_admin_user_id, 'admin')
$$;

-- 7. Update is_transfer_approved_for_unit function
CREATE OR REPLACE FUNCTION public.is_transfer_approved_for_unit(
  _user_id uuid,
  _unit_type text,
  _battalion_id uuid,
  _company_id uuid,
  _platoon_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.personnel p
    WHERE p.user_id = _user_id
    AND p.is_signature_approved = true
    AND (
      -- Check if personnel is in the battalion
      (_unit_type = 'battalion' AND p.battalion_id = _battalion_id)
      OR
      -- Check if personnel is in the company
      (_unit_type = 'company' AND p.company_id = _company_id)
      OR
      -- Check if personnel is in the platoon
      (_unit_type = 'platoon' AND p.platoon_id = _platoon_id)
    )
  )
$$;

-- 8. Update Personnel RLS policies (Remove Squad logic)
DROP POLICY IF EXISTS "Approved users can view personnel" ON public.personnel;

CREATE POLICY "Approved users can view personnel"
ON public.personnel
FOR SELECT
TO authenticated
USING (
  is_approved_user(auth.uid()) 
  AND (
    -- Users can always see their own record
    user_id = auth.uid()
    -- Admins can see all
    OR has_role(auth.uid(), 'admin'::app_role)
    -- Leaders can see personnel in their assigned units
    OR (
      has_role(auth.uid(), 'leader'::app_role) 
      AND EXISTS (
        SELECT 1 FROM admin_unit_assignments aua
        WHERE aua.user_id = auth.uid()
        AND (
          (aua.unit_type = 'battalion' AND personnel.battalion_id = aua.battalion_id)
          OR (aua.unit_type = 'company' AND personnel.company_id = aua.company_id)
          OR (aua.unit_type = 'platoon' AND personnel.platoon_id = aua.platoon_id)
        )
      )
    )
    -- Unit members can see each other (within the same platoon)
    OR (
      personnel.platoon_id IS NOT NULL 
      AND personnel.platoon_id = get_user_platoon_id(auth.uid())
    )
  )
);

-- 9. Clean up old functions
DROP FUNCTION IF EXISTS public.get_user_squad_id(uuid);
