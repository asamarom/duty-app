-- Drop existing foreign key constraints on signup_requests
ALTER TABLE public.signup_requests
DROP CONSTRAINT IF EXISTS signup_requests_requested_battalion_id_fkey;

ALTER TABLE public.signup_requests
DROP CONSTRAINT IF EXISTS signup_requests_requested_platoon_id_fkey;

ALTER TABLE public.signup_requests
DROP CONSTRAINT IF EXISTS signup_requests_requested_squad_id_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE public.signup_requests
ADD CONSTRAINT signup_requests_requested_battalion_id_fkey
FOREIGN KEY (requested_battalion_id) REFERENCES public.battalions(id) ON DELETE SET NULL;

ALTER TABLE public.signup_requests
ADD CONSTRAINT signup_requests_requested_platoon_id_fkey
FOREIGN KEY (requested_platoon_id) REFERENCES public.platoons(id) ON DELETE SET NULL;

ALTER TABLE public.signup_requests
ADD CONSTRAINT signup_requests_requested_squad_id_fkey
FOREIGN KEY (requested_squad_id) REFERENCES public.squads(id) ON DELETE SET NULL;