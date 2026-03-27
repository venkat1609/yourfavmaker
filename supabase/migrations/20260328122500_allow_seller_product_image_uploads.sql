DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can upload product images" ON storage.objects;

-- Allow approved sellers and admins to upload product images to the public bucket.
CREATE POLICY "Sellers and admins can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.sellers
      WHERE user_id = auth.uid()
        AND status = 'approved'
    )
  )
);
