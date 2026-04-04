-- Extend sellers with metadata for future multi-store support and make the seller/store relationship explicit.

BEGIN;

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS onboarding_step text NOT NULL DEFAULT 'profile';
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'INR';
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS preferred_payout_frequency text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false;
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz;
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS badge text;
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS default_store_id uuid;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS seller_id uuid;

UPDATE public.stores
SET seller_id = s.id
FROM public.sellers s
WHERE public.stores.user_id = s.user_id
  AND public.stores.user_id IS NOT NULL
  AND s.user_id IS NOT NULL;

ALTER TABLE public.stores
  ALTER COLUMN seller_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
      AND table_name = 'stores'
      AND constraint_name = 'stores_seller_id_fkey'
  ) THEN
    ALTER TABLE public.stores
      ADD CONSTRAINT stores_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_stores_seller_id ON public.stores (seller_id);
CREATE INDEX IF NOT EXISTS idx_sellers_default_store_id ON public.sellers (default_store_id);

UPDATE public.sellers s
SET default_store_id = st.id
FROM (
  SELECT DISTINCT ON (seller_id) seller_id, id
  FROM public.stores
  ORDER BY seller_id, created_at ASC, id ASC
) st
WHERE s.id = st.seller_id
  AND s.default_store_id IS NULL;

-- Update policies to rely on the seller/store relationship instead of direct user_id strips.
DROP POLICY IF EXISTS "Stores can manage own products" ON public.products;
DROP POLICY IF EXISTS "Stores can manage own product attributes" ON public.product_attributes;
DROP POLICY IF EXISTS "Stores can manage own product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Stores can manage own collections" ON public.collections;
DROP POLICY IF EXISTS "Stores and admins can view store order items" ON public.order_items;
DROP POLICY IF EXISTS "Stores and admins can view store orders" ON public.orders;
DROP POLICY IF EXISTS "Stores and admins can upload product images" ON storage.objects;

CREATE POLICY "Stores can manage own products"
  ON public.products FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores st
      JOIN public.sellers sel ON sel.id = st.seller_id
      WHERE st.id = public.products.seller_id
        AND sel.user_id = auth.uid()
        AND sel.status = 'approved'
    )
  );

CREATE POLICY "Stores can manage own product attributes"
  ON public.product_attributes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.stores st ON st.id = p.seller_id
      JOIN public.sellers sel ON sel.id = st.seller_id
      WHERE p.id = public.product_attributes.product_id
        AND sel.user_id = auth.uid()
        AND sel.status = 'approved'
    )
  );

CREATE POLICY "Stores can manage own product variants"
  ON public.product_variants FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.stores st ON st.id = p.seller_id
      JOIN public.sellers sel ON sel.id = st.seller_id
      WHERE p.id = public.product_variants.product_id
        AND sel.user_id = auth.uid()
        AND sel.status = 'approved'
    )
  );

CREATE POLICY "Stores can manage own collections"
  ON public.collections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores st
      JOIN public.sellers sel ON sel.id = st.seller_id
      WHERE st.id = public.collections.seller_id
        AND sel.user_id = auth.uid()
        AND sel.status = 'approved'
    )
  );

CREATE POLICY "Stores and admins can view store order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.stores st ON st.id = p.seller_id
      JOIN public.sellers sel ON sel.id = st.seller_id
      WHERE p.id = public.order_items.product_id
        AND sel.user_id = auth.uid()
        AND sel.status = 'approved'
    )
  );

CREATE POLICY "Stores and admins can view store orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      JOIN public.stores st ON st.id = p.seller_id
      JOIN public.sellers sel ON sel.id = st.seller_id
      WHERE oi.order_id = public.orders.id
        AND sel.user_id = auth.uid()
        AND sel.status = 'approved'
    )
  );

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
        JOIN public.sellers sel ON sel.id = st.seller_id
        WHERE sel.user_id = auth.uid()
          AND sel.status = 'approved'
      )
    )
  );

COMMIT;
