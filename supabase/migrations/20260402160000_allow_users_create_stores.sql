-- Allow authenticated users to insert their own storefront row during onboarding.
BEGIN;

CREATE POLICY "Users can create own store"
  ON public.stores FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own store"
  ON public.stores FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
