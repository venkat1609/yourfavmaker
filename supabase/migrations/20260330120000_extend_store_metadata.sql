-- Extend stores with additional metadata for future store-specific workflows.

BEGIN;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS onboarding_step text NOT NULL DEFAULT 'profile';
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'INR';
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS preferred_payout_frequency text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false;
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz;
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS badge text;

-- Rebuild policies so they rely solely on stores and their owner user_id.
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
      WHERE st.id = public.products.seller_id
        AND st.user_id = auth.uid()
        AND st.status = 'approved'
    )
  );

CREATE POLICY "Stores can manage own product attributes"
  ON public.product_attributes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.stores st ON st.id = p.seller_id
      WHERE p.id = public.product_attributes.product_id
        AND st.user_id = auth.uid()
        AND st.status = 'approved'
    )
  );

CREATE POLICY "Stores can manage own product variants"
  ON public.product_variants FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.stores st ON st.id = p.seller_id
      WHERE p.id = public.product_variants.product_id
        AND st.user_id = auth.uid()
        AND st.status = 'approved'
    )
  );

CREATE POLICY "Stores can manage own collections"
  ON public.collections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores st
      WHERE st.id = public.collections.seller_id
        AND st.user_id = auth.uid()
        AND st.status = 'approved'
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
      WHERE p.id = public.order_items.product_id
        AND st.user_id = auth.uid()
        AND st.status = 'approved'
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
      WHERE oi.order_id = public.orders.id
        AND st.user_id = auth.uid()
        AND st.status = 'approved'
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
        WHERE st.user_id = auth.uid()
          AND st.status = 'approved'
      )
    )
  );

COMMIT;
