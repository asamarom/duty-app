-- ============================================
-- DUTY APP - Initial Schema (Simplified)
-- Unified units table with self-referential hierarchy
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'leader', 'user');
CREATE TYPE public.unit_status AS ENUM ('active', 'inactive', 'deployed');
CREATE TYPE public.unit_type AS ENUM ('battalion', 'company', 'platoon');
CREATE TYPE public.equipment_status AS ENUM ('serviceable', 'unserviceable', 'in_maintenance', 'missing', 'pending_transfer');
CREATE TYPE public.location_status AS ENUM ('home', 'on_duty', 'off_duty', 'active_mission', 'leave', 'tdy');
CREATE TYPE public.readiness_status AS ENUM ('ready', 'warning', 'critical');
CREATE TYPE public.assignment_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.signup_request_status AS ENUM ('pending', 'approved', 'declined');

-- ============================================
-- HELPER FUNCTIONS (must come before policies)
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- USER ROLES TABLE (create early, no policies yet)
-- ============================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Basic policy that doesn't need has_role
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- HAS_ROLE FUNCTION (must come before policies that use it)
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Now add policies that use has_role
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  unit_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- UNIFIED UNITS TABLE
-- ============================================

CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_type public.unit_type NOT NULL,
  parent_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.unit_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_unit_hierarchy CHECK (
    (unit_type = 'battalion' AND parent_id IS NULL) OR
    (unit_type IN ('company', 'platoon') AND parent_id IS NOT NULL)
  )
);

CREATE INDEX idx_units_parent_id ON public.units(parent_id);
CREATE INDEX idx_units_type ON public.units(unit_type);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view units"
  ON public.units FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage units"
  ON public.units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Leaders can manage units"
  ON public.units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'leader'));

CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key from profiles to units (now that units table exists)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_unit_id_fkey
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

-- ============================================
-- PERSONNEL TABLE
-- ============================================

CREATE TABLE public.personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  service_number TEXT NOT NULL,
  rank TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  duty_position TEXT,
  phone TEXT,
  email TEXT,
  local_address TEXT,
  profile_image TEXT,
  location_status public.location_status NOT NULL DEFAULT 'home',
  readiness_status public.readiness_status NOT NULL DEFAULT 'ready',
  skills TEXT[] DEFAULT '{}',
  driver_licenses TEXT[] DEFAULT '{}',
  is_signature_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_personnel_user_id ON public.personnel(user_id);
CREATE INDEX idx_personnel_unit_id ON public.personnel(unit_id);

ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view personnel"
  ON public.personnel FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own personnel record"
  ON public.personnel FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins and leaders can manage personnel"
  ON public.personnel FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'leader')
  );

CREATE TRIGGER update_personnel_updated_at
  BEFORE UPDATE ON public.personnel
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- EQUIPMENT TABLE
-- ============================================

CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  serial_number TEXT,
  description TEXT,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  status public.equipment_status NOT NULL DEFAULT 'serviceable',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipment"
  ON public.equipment FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create equipment"
  ON public.equipment FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and leaders can manage equipment"
  ON public.equipment FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'leader')
  );

CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- EQUIPMENT ASSIGNMENTS TABLE
-- ============================================

CREATE TABLE public.equipment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  personnel_id UUID REFERENCES public.personnel(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_assignments_equipment_id ON public.equipment_assignments(equipment_id);
CREATE INDEX idx_equipment_assignments_personnel_id ON public.equipment_assignments(personnel_id);
CREATE INDEX idx_equipment_assignments_unit_id ON public.equipment_assignments(unit_id);

ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assignments"
  ON public.equipment_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create assignments"
  ON public.equipment_assignments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assignments"
  ON public.equipment_assignments FOR UPDATE TO authenticated USING (true);

-- ============================================
-- ASSIGNMENT REQUESTS TABLE
-- ============================================

CREATE TABLE public.assignment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  from_unit_type TEXT NOT NULL,
  from_unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  from_personnel_id UUID REFERENCES public.personnel(id) ON DELETE SET NULL,
  to_unit_type TEXT NOT NULL,
  to_unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  to_personnel_id UUID REFERENCES public.personnel(id) ON DELETE SET NULL,
  status public.assignment_request_status NOT NULL DEFAULT 'pending',
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  recipient_approved BOOLEAN NOT NULL DEFAULT false,
  recipient_approved_at TIMESTAMPTZ,
  recipient_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assignment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view requests"
  ON public.assignment_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create requests"
  ON public.assignment_requests FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update requests"
  ON public.assignment_requests FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_assignment_requests_updated_at
  BEFORE UPDATE ON public.assignment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ADMIN UNIT ASSIGNMENTS TABLE
-- ============================================

CREATE TABLE public.admin_unit_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  unit_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_unit_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view admin assignments"
  ON public.admin_unit_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage admin assignments"
  ON public.admin_unit_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SIGNUP REQUESTS TABLE
-- ============================================

CREATE TABLE public.signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_number TEXT NOT NULL,
  requested_unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  status public.signup_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  decline_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own signup requests"
  ON public.signup_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins and leaders can view all signup requests"
  ON public.signup_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'leader')
  );

CREATE POLICY "Users can create signup requests"
  ON public.signup_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins and leaders can update signup requests"
  ON public.signup_requests FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'leader')
  );

CREATE TRIGGER update_signup_requests_updated_at
  BEFORE UPDATE ON public.signup_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- UNIT HELPER FUNCTIONS
-- ============================================

-- Get unit's battalion (root ancestor)
CREATE OR REPLACE FUNCTION public.get_unit_battalion(p_unit_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE unit_chain AS (
    SELECT id, parent_id, unit_type
    FROM public.units
    WHERE id = p_unit_id

    UNION ALL

    SELECT u.id, u.parent_id, u.unit_type
    FROM public.units u
    JOIN unit_chain uc ON u.id = uc.parent_id
  )
  SELECT id FROM unit_chain WHERE unit_type = 'battalion' LIMIT 1;
$$;

-- Get all ancestor unit IDs (including self)
CREATE OR REPLACE FUNCTION public.get_unit_ancestors(p_unit_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE unit_chain AS (
    SELECT id, parent_id
    FROM public.units
    WHERE id = p_unit_id

    UNION ALL

    SELECT u.id, u.parent_id
    FROM public.units u
    JOIN unit_chain uc ON u.id = uc.parent_id
  )
  SELECT ARRAY_AGG(id) FROM unit_chain;
$$;

-- Get all descendant unit IDs (including self)
CREATE OR REPLACE FUNCTION public.get_unit_descendants(p_unit_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE unit_tree AS (
    SELECT id, parent_id
    FROM public.units
    WHERE id = p_unit_id

    UNION ALL

    SELECT u.id, u.parent_id
    FROM public.units u
    JOIN unit_tree ut ON u.parent_id = ut.id
  )
  SELECT ARRAY_AGG(id) FROM unit_tree;
$$;

-- Check if user can manage a unit
CREATE OR REPLACE FUNCTION public.can_manage_unit(p_user_id UUID, p_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    has_role(p_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM admin_unit_assignments aua
      WHERE aua.user_id = p_user_id
      AND (
        aua.unit_id = p_unit_id
        OR aua.unit_id = ANY(get_unit_ancestors(p_unit_id))
      )
    );
$$;

-- Get user's unit_id from personnel
CREATE OR REPLACE FUNCTION public.get_user_unit_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unit_id FROM personnel WHERE user_id = p_user_id LIMIT 1;
$$;

-- Check if user is approved (has personnel record)
CREATE OR REPLACE FUNCTION public.is_approved_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM personnel WHERE user_id = p_user_id
  );
$$;

-- ============================================
-- TRANSFER FUNCTIONS
-- ============================================

-- Initiate equipment transfer
CREATE OR REPLACE FUNCTION public.initiate_transfer(
  p_equipment_id UUID,
  p_to_unit_id UUID DEFAULT NULL,
  p_to_personnel_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_assignment RECORD;
  v_request_id UUID;
  v_is_serialized BOOLEAN;
BEGIN
  -- Get current assignment
  SELECT * INTO v_current_assignment
  FROM equipment_assignments
  WHERE equipment_id = p_equipment_id AND returned_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equipment is not currently assigned';
  END IF;

  -- Check if serialized
  SELECT (serial_number IS NOT NULL AND serial_number <> '') INTO v_is_serialized
  FROM equipment WHERE id = p_equipment_id;

  -- Serialized equipment must go to personnel
  IF v_is_serialized AND p_to_personnel_id IS NULL THEN
    RAISE EXCEPTION 'Serialized equipment can only be assigned to a person';
  END IF;

  -- Create transfer request
  INSERT INTO assignment_requests (
    equipment_id,
    from_unit_type,
    from_unit_id,
    from_personnel_id,
    to_unit_type,
    to_unit_id,
    to_personnel_id,
    requested_by,
    notes,
    status
  ) VALUES (
    p_equipment_id,
    CASE WHEN v_current_assignment.personnel_id IS NOT NULL THEN 'individual'
         ELSE COALESCE((SELECT unit_type::text FROM units WHERE id = v_current_assignment.unit_id), 'unassigned') END,
    v_current_assignment.unit_id,
    v_current_assignment.personnel_id,
    CASE WHEN p_to_personnel_id IS NOT NULL THEN 'individual'
         ELSE COALESCE((SELECT unit_type::text FROM units WHERE id = p_to_unit_id), 'unassigned') END,
    p_to_unit_id,
    p_to_personnel_id,
    auth.uid(),
    p_notes,
    'pending'
  ) RETURNING id INTO v_request_id;

  -- Update equipment status
  UPDATE equipment SET status = 'pending_transfer' WHERE id = p_equipment_id;

  RETURN v_request_id;
END;
$$;

-- Process transfer (approve/reject)
CREATE OR REPLACE FUNCTION public.process_transfer(
  p_request_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request FROM assignment_requests WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF p_action = 'approved' THEN
    -- Close old assignment
    UPDATE equipment_assignments
    SET returned_at = now()
    WHERE equipment_id = v_request.equipment_id AND returned_at IS NULL;

    -- Create new assignment
    INSERT INTO equipment_assignments (
      equipment_id,
      personnel_id,
      unit_id,
      assigned_by
    ) VALUES (
      v_request.equipment_id,
      v_request.to_personnel_id,
      v_request.to_unit_id,
      auth.uid()
    );

    -- Restore equipment status
    UPDATE equipment SET status = 'serviceable' WHERE id = v_request.equipment_id;

    -- Update request
    UPDATE assignment_requests
    SET status = 'approved',
        recipient_approved = true,
        recipient_approved_at = now(),
        recipient_approved_by = auth.uid()
    WHERE id = p_request_id;

  ELSIF p_action = 'rejected' THEN
    UPDATE equipment SET status = 'serviceable' WHERE id = v_request.equipment_id;
    UPDATE assignment_requests SET status = 'rejected' WHERE id = p_request_id;
  END IF;
END;
$$;
