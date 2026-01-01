-- Drop existing foreign key constraints if they exist
ALTER TABLE public.assignment_requests 
DROP CONSTRAINT IF EXISTS assignment_requests_requested_by_fkey;

ALTER TABLE public.assignment_approvals 
DROP CONSTRAINT IF EXISTS assignment_approvals_action_by_fkey;

-- Add foreign key constraints to profiles table
ALTER TABLE public.assignment_requests 
ADD CONSTRAINT assignment_requests_requested_by_fkey 
FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.assignment_approvals 
ADD CONSTRAINT assignment_approvals_action_by_fkey 
FOREIGN KEY (action_by) REFERENCES public.profiles(id) ON DELETE SET NULL;