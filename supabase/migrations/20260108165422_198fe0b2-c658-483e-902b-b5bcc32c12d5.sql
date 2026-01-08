-- Allow authenticated users to view battalions for signup purposes
-- This is needed because users need to select a battalion during signup before they're approved

CREATE POLICY "Authenticated users can view battalions for signup"
ON public.battalions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Also allow viewing companies for unit tree
CREATE POLICY "Authenticated users can view companies for signup"
ON public.companies
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Also allow viewing platoons for unit tree
CREATE POLICY "Authenticated users can view platoons for signup"
ON public.platoons
FOR SELECT
USING (auth.uid() IS NOT NULL);