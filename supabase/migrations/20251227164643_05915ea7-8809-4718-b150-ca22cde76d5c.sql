
-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'leader', 'user');
CREATE TYPE public.location_status AS ENUM ('home', 'on_duty', 'off_duty', 'active_mission', 'leave', 'tdy');
CREATE TYPE public.readiness_status AS ENUM ('ready', 'warning', 'critical');
CREATE TYPE public.unit_status AS ENUM ('active', 'inactive', 'deployed');
CREATE TYPE public.equipment_status AS ENUM ('serviceable', 'unserviceable', 'in_maintenance', 'missing');

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Battalions table
CREATE TABLE public.battalions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  designation TEXT,
  commander_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status unit_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.battalions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view battalions" ON public.battalions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage battalions" ON public.battalions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Platoons table
CREATE TABLE public.platoons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battalion_id UUID REFERENCES public.battalions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  designation TEXT,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status unit_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platoons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view platoons" ON public.platoons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and leaders can manage platoons" ON public.platoons FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));

-- Squads table
CREATE TABLE public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platoon_id UUID REFERENCES public.platoons(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  designation TEXT,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status unit_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view squads" ON public.squads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and leaders can manage squads" ON public.squads FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));

-- Personnel table
CREATE TABLE public.personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service_number TEXT NOT NULL UNIQUE,
  rank TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  duty_position TEXT,
  squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL,
  location_status location_status NOT NULL DEFAULT 'home',
  readiness_status readiness_status NOT NULL DEFAULT 'ready',
  skills TEXT[] DEFAULT '{}',
  driver_licenses TEXT[] DEFAULT '{}',
  phone TEXT,
  email TEXT,
  local_address TEXT,
  profile_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view personnel" ON public.personnel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and leaders can manage personnel" ON public.personnel FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));
CREATE POLICY "Users can update own personnel record" ON public.personnel FOR UPDATE TO authenticated 
  USING (user_id = auth.uid());

-- Equipment table
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status equipment_status NOT NULL DEFAULT 'serviceable',
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipment" ON public.equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and leaders can manage equipment" ON public.equipment FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));

-- Equipment assignments table (with history)
CREATE TABLE public.equipment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE NOT NULL,
  personnel_id UUID REFERENCES public.personnel(id) ON DELETE SET NULL,
  squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL,
  platoon_id UUID REFERENCES public.platoons(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assignments" ON public.equipment_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and leaders can manage assignments" ON public.equipment_assignments FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'leader'));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_battalions_updated_at BEFORE UPDATE ON public.battalions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_platoons_updated_at BEFORE UPDATE ON public.platoons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_squads_updated_at BEFORE UPDATE ON public.squads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_personnel_updated_at BEFORE UPDATE ON public.personnel FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
