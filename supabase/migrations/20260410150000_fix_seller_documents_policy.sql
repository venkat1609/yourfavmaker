-- Ensure seller document policies validate ownership via store_id rather than metadata user_id text comparison.
BEGIN;

DROP POLICY IF EXISTS "Seller documents owner or admin can read" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can upload documents" ON storage.objects;

CREATE POLICY "Seller documents owner or admin can read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'seller-documents'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1
        FROM public.stores st
        WHERE st.status IN ('pending', 'approved')
          AND st.user_id = auth.uid()
          AND st.id = NULLIF(metadata->>'store_id', '')::uuid
      )
    )
  );

CREATE POLICY "Sellers can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'seller-documents'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1
        FROM public.stores st
        WHERE st.status IN ('pending', 'approved')
          AND st.user_id = auth.uid()
          AND st.id = NULLIF(metadata->>'store_id', '')::uuid
      )
    )
  );

COMMIT;
