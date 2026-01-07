
-- Phase 1: Add transfer_approved column to personnel
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS transfer_approved boolean NOT NULL DEFAULT false;

-- Phase 2: Add recipient approval columns to assignment_requests
ALTER TABLE public.assignment_requests ADD COLUMN IF NOT EXISTS recipient_approved boolean NOT NULL DEFAULT false;
ALTER TABLE public.assignment_requests ADD COLUMN IF NOT EXISTS recipient_approved_at timestamp with time zone;
ALTER TABLE public.assignment_requests ADD COLUMN IF NOT EXISTS recipient_approved_by uuid REFERENCES public.profiles(id);

-- Phase 3: Create companies table (copy of squads structure with battalion reference)
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battalion_id uuid NOT NULL REFERENCES public.battalions(id) ON DELETE CASCADE,
  name text NOT NULL,
  designation text,
  leader_id uuid REFERENCES public.profiles(id),
  status public.unit_status NOT NULL DEFAULT 'active'::unit_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Phase 4: Add company_id to platoons (platoons will now be under companies)
ALTER TABLE public.platoons ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Phase 5: Add company_id to personnel
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Phase 6: Add company_id to equipment_assignments
ALTER TABLE public.equipment_assignments ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Phase 7: Add company columns to assignment_requests
ALTER TABLE public.assignment_requests ADD COLUMN IF NOT EXISTS from_company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.assignment_requests ADD COLUMN IF NOT EXISTS to_company_id uuid REFERENCES public.companies(id);

-- Phase 8: Add company columns to admin_unit_assignments
ALTER TABLE public.admin_unit_assignments ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Phase 9: Add company columns to signup_requests
ALTER TABLE public.signup_requests ADD COLUMN IF NOT EXISTS requested_company_id uuid REFERENCES public.companies(id);

-- Phase 10: Enable RLS on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Phase 11: Create RLS policies for companies table
CREATE POLICY "Admins can manage companies"
ON public.companies
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Leaders can manage companies"
ON public.companies
FOR ALL
USING (has_role(auth.uid(), 'leader'::app_role));

CREATE POLICY "Authenticated users can view companies"
ON public.companies
FOR SELECT
USING (true);

-- Phase 12: Create trigger for companies updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 13: Update can_admin_manage_unit function to include company
CREATE OR REPLACE FUNCTION public.can_admin_manage_unit(
  _admin_user_id uuid, 
  _unit_type text, 
  _battalion_id uuid, 
  _platoon_id uuid, 
  _squad_id uuid,
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
      OR
      -- Legacy support for squad-based assignments (will be deprecated)
      (a.unit_type = 'squad' AND a.squad_id = _squad_id)
    )
  )
  OR has_role(_admin_user_id, 'admin')
$$;

-- Phase 14: Create function to check if user is transfer approved for a unit
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
    AND p.transfer_approved = true
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

-- Phase 15: Create function to check if user can initiate transfer for equipment
CREATE OR REPLACE FUNCTION public.can_initiate_transfer(
  _user_id uuid,
  _equipment_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.equipment_assignments ea
    WHERE ea.equipment_id = _equipment_id
    AND ea.returned_at IS NULL
    AND (
      -- Individual owner can transfer their equipment
      (ea.personnel_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.personnel p WHERE p.id = ea.personnel_id AND p.user_id = _user_id
      ))
      OR
      -- Transfer approved soldier can transfer unit equipment
      (ea.personnel_id IS NULL AND (
        -- Battalion equipment
        (ea.battalion_id IS NOT NULL AND ea.company_id IS NULL AND ea.platoon_id IS NULL
          AND is_transfer_approved_for_unit(_user_id, 'battalion', ea.battalion_id, NULL, NULL))
        OR
        -- Company equipment
        (ea.company_id IS NOT NULL AND ea.platoon_id IS NULL
          AND is_transfer_approved_for_unit(_user_id, 'company', NULL, ea.company_id, NULL))
        OR
        -- Platoon equipment
        (ea.platoon_id IS NOT NULL
          AND is_transfer_approved_for_unit(_user_id, 'platoon', NULL, NULL, ea.platoon_id))
      ))
    )
  )
  OR has_role(_user_id, 'admin')
$$;

-- Phase 16: Create function to check if user can accept transfer
CREATE OR REPLACE FUNCTION public.can_accept_transfer(
  _user_id uuid,
  _request_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignment_requests ar
    WHERE ar.id = _request_id
    AND (
      -- Individual recipient can accept
      (ar.to_unit_type = 'individual' AND ar.to_personnel_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.personnel p WHERE p.id = ar.to_personnel_id AND p.user_id = _user_id
      ))
      OR
      -- Transfer approved soldier can accept for unit
      (ar.to_unit_type = 'battalion' AND is_transfer_approved_for_unit(_user_id, 'battalion', ar.to_battalion_id, NULL, NULL))
      OR
      (ar.to_unit_type = 'company' AND is_transfer_approved_for_unit(_user_id, 'company', NULL, ar.to_company_id, NULL))
      OR
      (ar.to_unit_type = 'platoon' AND is_transfer_approved_for_unit(_user_id, 'platoon', NULL, NULL, ar.to_platoon_id))
    )
  )
  OR has_role(_user_id, 'admin')
$$;

-- Phase 17: Add policy for recipients to view their incoming transfer requests
CREATE POLICY "Recipients can view incoming transfer requests"
ON public.assignment_requests
FOR SELECT
USING (can_accept_transfer(auth.uid(), id));

-- Phase 18: Add policy for recipients to update recipient_approved on their requests
CREATE POLICY "Recipients can approve incoming transfers"
ON public.assignment_requests
FOR UPDATE
USING (can_accept_transfer(auth.uid(), id));

-- Phase 19: Update can_assign_leader_role to include company
CREATE OR REPLACE FUNCTION public.can_assign_leader_role(_assigner_user_id uuid, _target_personnel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    has_role(_assigner_user_id, 'admin'::app_role)
    OR
    (
      has_role(_assigner_user_id, 'leader'::app_role)
      AND EXISTS (
        SELECT 1 FROM personnel p
        JOIN admin_unit_assignments a ON a.user_id = _assigner_user_id
        WHERE p.id = _target_personnel_id
        AND (
          (a.unit_type = 'battalion' AND p.battalion_id = a.battalion_id)
          OR
          (a.unit_type = 'company' AND p.company_id = a.company_id)
          OR
          (a.unit_type = 'platoon' AND p.platoon_id = a.platoon_id)
        )
      )
    )
$$;
