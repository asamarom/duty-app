-- First, create a SECURITY DEFINER function to check squad membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_squad_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT squad_id
  FROM public.personnel
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Approved users can view personnel" ON public.personnel;

-- Recreate the policy using the security definer function to avoid recursion
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
          OR (aua.unit_type = 'squad' AND personnel.squad_id = aua.squad_id)
        )
      )
    )
    -- Squad members can see each other (using security definer function to avoid recursion)
    OR (
      personnel.squad_id IS NOT NULL 
      AND personnel.squad_id = get_user_squad_id(auth.uid())
    )
  )
);

-- Also add a separate INSERT policy for admins/leaders to insert personnel
CREATE POLICY "Admins and leaders can insert personnel"
ON public.personnel
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'leader'::app_role)
);