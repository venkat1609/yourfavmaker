-- Allow sellers to upload product images even before approval.
BEGIN;

DROP POLICY IF EXISTS "Stores and admins can upload product images" ON storage.objects;

CREATE POLICY "Stores and admins can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1
        FROM public.stores st
        WHERE st.user_id = auth.uid()
          AND st.status IN ('pending', 'approved')
      )
    )
  );

COMMIT;
