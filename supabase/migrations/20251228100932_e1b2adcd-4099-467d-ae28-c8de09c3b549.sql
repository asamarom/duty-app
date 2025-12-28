-- Fix signup_requests policies to only allow authenticated users
DROP POLICY IF EXISTS "Users can view their own requests" ON public.signup_requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON public.signup_requests;
DROP POLICY IF EXISTS "Admins can view requests for their units" ON public.signup_requests;
DROP POLICY IF EXISTS "Admins can update requests for their units" ON public.signup_requests;

CREATE POLICY "Users can view their own requests"
ON public.signup_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests"
ON public.signup_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view requests for their units"
ON public.signup_requests
FOR SELECT
TO authenticated
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
TO authenticated
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

-- Fix admin_unit_assignments policies
DROP POLICY IF EXISTS "Admins can manage unit assignments" ON public.admin_unit_assignments;
DROP POLICY IF EXISTS "Users can view their own assignments" ON public.admin_unit_assignments;

CREATE POLICY "Admins can manage unit assignments"
ON public.admin_unit_assignments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own assignments"
ON public.admin_unit_assignments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix existing table policies to use TO authenticated
DROP POLICY IF EXISTS "Admins can manage battalions" ON public.battalions;
DROP POLICY IF EXISTS "Authenticated users can view battalions" ON public.battalions;
CREATE POLICY "Admins can manage battalions" ON public.battalions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view battalions" ON public.battalions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and leaders can manage equipment" ON public.equipment;
DROP POLICY IF EXISTS "Authenticated users can view equipment" ON public.equipment;
CREATE POLICY "Admins and leaders can manage equipment" ON public.equipment FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));
CREATE POLICY "Authenticated users can view equipment" ON public.equipment FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and leaders can manage assignments" ON public.equipment_assignments;
DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.equipment_assignments;
CREATE POLICY "Admins and leaders can manage assignments" ON public.equipment_assignments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));
CREATE POLICY "Authenticated users can view assignments" ON public.equipment_assignments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and leaders can manage personnel" ON public.personnel;
DROP POLICY IF EXISTS "Authenticated users can view personnel" ON public.personnel;
DROP POLICY IF EXISTS "Users can update own personnel record" ON public.personnel;
CREATE POLICY "Admins and leaders can manage personnel" ON public.personnel FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));
CREATE POLICY "Authenticated users can view personnel" ON public.personnel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own personnel record" ON public.personnel FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins and leaders can manage platoons" ON public.platoons;
DROP POLICY IF EXISTS "Authenticated users can view platoons" ON public.platoons;
CREATE POLICY "Admins and leaders can manage platoons" ON public.platoons FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));
CREATE POLICY "Authenticated users can view platoons" ON public.platoons FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and leaders can manage squads" ON public.squads;
DROP POLICY IF EXISTS "Authenticated users can view squads" ON public.squads;
CREATE POLICY "Admins and leaders can manage squads" ON public.squads FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'leader'::app_role));
CREATE POLICY "Authenticated users can view squads" ON public.squads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);