
-- Fix admin_unit_assignments foreign keys to allow cascade delete
ALTER TABLE public.admin_unit_assignments
DROP CONSTRAINT IF EXISTS admin_unit_assignments_battalion_id_fkey;

ALTER TABLE public.admin_unit_assignments
DROP CONSTRAINT IF EXISTS admin_unit_assignments_platoon_id_fkey;

ALTER TABLE public.admin_unit_assignments
DROP CONSTRAINT IF EXISTS admin_unit_assignments_squad_id_fkey;

-- Re-add with ON DELETE CASCADE (remove assignment when unit is deleted)
ALTER TABLE public.admin_unit_assignments
ADD CONSTRAINT admin_unit_assignments_battalion_id_fkey
FOREIGN KEY (battalion_id) REFERENCES public.battalions(id) ON DELETE CASCADE;

ALTER TABLE public.admin_unit_assignments
ADD CONSTRAINT admin_unit_assignments_platoon_id_fkey
FOREIGN KEY (platoon_id) REFERENCES public.platoons(id) ON DELETE CASCADE;

ALTER TABLE public.admin_unit_assignments
ADD CONSTRAINT admin_unit_assignments_squad_id_fkey
FOREIGN KEY (squad_id) REFERENCES public.squads(id) ON DELETE CASCADE;
