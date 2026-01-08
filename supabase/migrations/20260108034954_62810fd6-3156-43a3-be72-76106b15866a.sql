-- Fix CLIENT_SIDE_AUTH and PUBLIC_DATA_EXPOSURE security issues
-- This migration enforces approval status at the database level

-- 1. Create helper function to check if user is approved (or is an admin who doesn't need approval)
CREATE OR REPLACE FUNCTION public.is_approved_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins are always approved
    has_role(_user_id, 'admin'::app_role)
    OR
    -- Check if user has an approved signup request
    EXISTS (
      SELECT 1 FROM signup_requests
      WHERE user_id = _user_id 
      AND status = 'approved'
    )
$$;

-- 2. Update personnel table - restrict viewing to approved users with proper unit access
DROP POLICY IF EXISTS "Authenticated users can view personnel" ON public.personnel;

CREATE POLICY "Approved users can view personnel" ON public.personnel 
FOR SELECT TO authenticated
USING (
  is_approved_user(auth.uid()) 
  AND (
    -- Users can always see their own record
    user_id = auth.uid() 
    -- Admins can see all personnel
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
          OR (aua.unit_type = 'squad' AND personnel.squad_id = aua.squad_id)
        )
      )
    )
    -- Regular users can see personnel in their own squad
    OR (
      EXISTS (
        SELECT 1 FROM personnel my_personnel
        WHERE my_personnel.user_id = auth.uid()
        AND personnel.squad_id = my_personnel.squad_id
        AND personnel.squad_id IS NOT NULL
      )
    )
  )
);

-- 3. Update battalions table - require approval
DROP POLICY IF EXISTS "Authenticated users can view battalions" ON public.battalions;

CREATE POLICY "Approved users can view battalions" ON public.battalions
FOR SELECT TO authenticated
USING (is_approved_user(auth.uid()));

-- 4. Update companies table - require approval
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;

CREATE POLICY "Approved users can view companies" ON public.companies
FOR SELECT TO authenticated
USING (is_approved_user(auth.uid()));

-- 5. Update platoons table - require approval
DROP POLICY IF EXISTS "Authenticated users can view platoons" ON public.platoons;

CREATE POLICY "Approved users can view platoons" ON public.platoons
FOR SELECT TO authenticated
USING (is_approved_user(auth.uid()));

-- 6. Update squads table - require approval
DROP POLICY IF EXISTS "Authenticated users can view squads" ON public.squads;

CREATE POLICY "Approved users can view squads" ON public.squads
FOR SELECT TO authenticated
USING (is_approved_user(auth.uid()));

-- 7. Update equipment table - require approval
DROP POLICY IF EXISTS "Authenticated users can view equipment" ON public.equipment;

CREATE POLICY "Approved users can view equipment" ON public.equipment
FOR SELECT TO authenticated
USING (is_approved_user(auth.uid()));

-- 8. Update equipment_assignments table - require approval
DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.equipment_assignments;

CREATE POLICY "Approved users can view assignments" ON public.equipment_assignments
FOR SELECT TO authenticated
USING (is_approved_user(auth.uid()));

-- 9. Update equipment_transfer_history table - require approval
DROP POLICY IF EXISTS "Authenticated users can view transfer history" ON public.equipment_transfer_history;

CREATE POLICY "Approved users can view transfer history" ON public.equipment_transfer_history
FOR SELECT TO authenticated
USING (is_approved_user(auth.uid()));

-- 10. Update profiles table - require approval for viewing other profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Approved users can view profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  -- Users can always view their own profile
  auth.uid() = id
  OR
  -- Approved users can view other profiles
  is_approved_user(auth.uid())
);