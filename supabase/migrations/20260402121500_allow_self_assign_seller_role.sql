-- Allow authenticated users to insert their own seller role for onboarding.
CREATE POLICY "Users can add seller role"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'seller'
  );
