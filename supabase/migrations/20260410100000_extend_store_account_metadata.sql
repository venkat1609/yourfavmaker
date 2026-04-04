-- Extend store metadata to capture the modern business and document fields.
BEGIN;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS pan text,
  ADD COLUMN IF NOT EXISTS pickup_address_street text,
  ADD COLUMN IF NOT EXISTS pickup_address_city text,
  ADD COLUMN IF NOT EXISTS pickup_address_state text,
  ADD COLUMN IF NOT EXISTS pickup_address_zip text,
  ADD COLUMN IF NOT EXISTS pickup_address_country text;

ALTER TABLE public.store_payments
  ADD COLUMN IF NOT EXISTS account_holder_name text,
  ADD COLUMN IF NOT EXISTS cancelled_cheque_url text,
  ADD COLUMN IF NOT EXISTS gst_certificate_url text,
  ADD COLUMN IF NOT EXISTS authorized_signature_url text;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('seller-documents', 'seller-documents', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Seller documents owner or admin can read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'seller-documents'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR COALESCE(metadata->>'user_id', '') = auth.uid()::text
    )
  );

CREATE POLICY "Sellers can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'seller-documents'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR COALESCE(metadata->>'user_id', '') = auth.uid()::text
    )
  );

COMMIT;
